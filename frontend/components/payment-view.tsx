"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { apiBaseUrl, formatRupiah, getStoredUserAuth, withCredentials } from "../lib/api";

type LocalPaymentCache = {
  user: { id: string; email: string; fullName: string; avatarUrl?: string | null };
  fileName: string;
  fileSizeBytes: number;
  package: { name: string; maxFileSizeMb: number; price: number };
  pricing?: {
    originalAmount: number;
    discountAmount: number;
    discountPercent: number | null;
    uniquePaymentCode?: number;
    finalAmount: number;
    voucherCode: string | null;
  };
  payment: {
    provider: string; providerRef: string;
    qrUrl: string | null; paymentLink: string | null;
    virtualAccount: string | null; amount: number;
    fee?: number; total?: number; expiredAt?: string | null; status: string;
  };
};

type DetailResponse = {
  success: boolean; message?: string;
  data: {
    id: string; publicId?: string; originalName: string; fileSizeBytes: number; paymentStatus: string;
    resultReportUrl?: string | null;
    package: { name: string; price: number; maxFileSizeMb: number };
    pricing: {
      originalAmount: number;
      discountAmount: number;
      discountPercent: number | null;
      uniquePaymentCode?: number;
      finalAmount: number;
      voucherCode: string | null;
    };
    user: { id: string; whatsapp?: string | null; email: string; fullName: string };
    payment: { provider: string; providerRef: string | null; amount: number; qrUrl: string | null; status: string; expiresAt: string | null; paidAt: string | null } | null;
  };
};

export default function PaymentView({ checkRequestId }: { checkRequestId: string }) {
  const [cache, setCache] = useState<LocalPaymentCache | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [publicId, setPublicId] = useState(checkRequestId);

  const loadDetail = useCallback(async () => {
    const auth = getStoredUserAuth();
    if (!auth?.user) {
      setError("Sesi Anda sudah berakhir. Silakan login kembali.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/checks/${checkRequestId}`, withCredentials());
      const payload = (await response.json()) as DetailResponse;
      if (!response.ok || !payload.success) throw new Error(payload.message || "Gagal mengambil detail pembayaran.");
      setPublicId(payload.data.publicId || checkRequestId);
      setPaymentStatus(payload.data.paymentStatus);
      setCache((prev) => ({
        user: prev?.user || { id: payload.data.user.id, email: payload.data.user.email, fullName: payload.data.user.fullName },
        fileName: payload.data.originalName,
        fileSizeBytes: payload.data.fileSizeBytes,
        package: payload.data.package,
        pricing: payload.data.pricing,
        payment: {
          provider: payload.data.payment?.provider || prev?.payment.provider || "verscan",
          providerRef: payload.data.payment?.providerRef || prev?.payment.providerRef || "",
          qrUrl: payload.data.payment?.qrUrl || prev?.payment.qrUrl || null,
          paymentLink: prev?.payment.paymentLink || null,
          virtualAccount: prev?.payment.virtualAccount || null,
          amount: payload.data.payment?.amount || payload.data.package.price,
          fee: prev?.payment.fee,
          total: prev?.payment.total,
          expiredAt: payload.data.payment?.expiresAt || prev?.payment.expiredAt || null,
          status: payload.data.payment?.status || payload.data.paymentStatus
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pembayaran.");
    } finally {
      setLoading(false);
    }
  }, [checkRequestId]);

  useEffect(() => {
    if (!checkRequestId) { setError("checkRequestId tidak ditemukan."); setLoading(false); return; }
    const local = sessionStorage.getItem(`payment:${checkRequestId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local) as LocalPaymentCache;
        setCache(parsed);
        setPaymentStatus(parsed.payment.status || "PENDING");
      } catch { sessionStorage.removeItem(`payment:${checkRequestId}`); }
    }
    void loadDetail();
  }, [checkRequestId, loadDetail]);

  // Countdown from expiredAt
  useEffect(() => {
    if (!cache?.payment.expiredAt) return;
    const expired = new Date(cache.payment.expiredAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((expired - Date.now()) / 1000));
      setCountdown(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cache?.payment.expiredAt]);

  // Auto-poll payment status every 5s while PENDING
  useEffect(() => {
    if (paymentStatus !== "PENDING" || !checkRequestId) return;
    const auth = getStoredUserAuth();
    if (!auth?.user) return;
    setPolling(true);
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/checks/${checkRequestId}/payment-status`, withCredentials());
        const data = await res.json();
        if (data?.data?.status && data.data.status.toUpperCase() !== "PENDING") {
          setPaymentStatus(data.data.status.toUpperCase());
          clearInterval(id);
          setPolling(false);
        }
      } catch { /* silent */ }
    }, 5000);
    return () => { clearInterval(id); setPolling(false); };
  }, [paymentStatus, checkRequestId]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <div style={{ width: "48px", height: "48px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat data pembayaran...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error && !cache) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", textAlign: "center" }}>
        <div style={{ fontSize: "48px" }}>⚠️</div>
        <h2 style={{ color: "var(--text-main)" }}>Terjadi Kesalahan</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "400px" }}>{error}</p>
        <Link href="/upload" className="button button-primary">Kembali ke Upload</Link>
      </div>
    );
  }

  if (!cache) return null;

  const qrUrl = cache.payment.qrUrl;
  const paymentLink = cache.payment.paymentLink;
  const isPaid = paymentStatus === "PAID";
  const isFailed = paymentStatus === "FAILED";
  const isExpired = paymentStatus === "EXPIRED";
  const total = cache.payment.total || cache.payment.amount;
  const pricing = cache.pricing || {
    originalAmount: cache.package.price,
    discountAmount: 0,
    discountPercent: null,
    uniquePaymentCode: 0,
    finalAmount: cache.payment.amount,
    voucherCode: null
  };

  return (
    <div style={{ minHeight: "100vh", padding: "48px 0 80px", background: "var(--bg-main)" }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(11,79,217,0.1)", border: "1px solid rgba(11,79,217,0.2)", borderRadius: "999px", padding: "6px 16px", marginBottom: "16px", fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>
            💳 HALAMAN PEMBAYARAN
          </div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, color: "var(--text-main)", marginBottom: "8px" }}>
            Selesaikan Pembayaran
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>
            Scan QR QRIS di bawah ini menggunakan aplikasi mobile banking atau dompet digital Anda.
          </p>
        </div>

        {/* PAID Banner */}
        {isPaid && (
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "16px", padding: "20px 24px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "32px" }}>✅</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#10b981" }}>Pembayaran Berhasil!</div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Dokumen Anda sedang diproses. Laporan akan segera tersedia.</div>
            </div>
            <Link href={`/processing/${publicId}`} className="button button-primary" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
              Lihat Status →
            </Link>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 380px)", gap: "32px", alignItems: "start" }} className="payment-grid">

          {/* QR Card */}
          <div style={{ background: "var(--surface)", borderRadius: "24px", border: "1px solid var(--border)", padding: "40px", textAlign: "center" }}>

            {/* QR Image */}
            <div style={{ display: "inline-block", padding: "20px", background: "white", borderRadius: "20px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", marginBottom: "24px", border: "1px solid var(--border)" }}>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Pembayaran QRIS" style={{ width: "240px", height: "240px", objectFit: "contain", display: "block" }} />
              ) : (
                <div style={{ width: "240px", height: "240px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--text-muted)" }}>
                  <span style={{ fontSize: "48px" }}>📱</span>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>QR belum tersedia</span>
                </div>
              )}
            </div>

            {/* QRIS Label + Countdown */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "var(--text-main)" }}>Bayar via QRIS</div>
              {countdown !== null && !isPaid && !isExpired && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: countdown < 120 ? "rgba(239,68,68,0.08)" : "rgba(11,79,217,0.08)", border: `1px solid ${countdown < 120 ? "rgba(239,68,68,0.2)" : "rgba(11,79,217,0.2)"}`, borderRadius: "999px", padding: "5px 14px", fontSize: "13px", fontWeight: 700, color: countdown < 120 ? "#ef4444" : "var(--primary)" }}>
                  ⏱ {formatCountdown(countdown)}
                </div>
              )}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.7, marginBottom: "28px", maxWidth: "360px", margin: "0 auto 28px" }}>
              Buka aplikasi bank atau e-wallet Anda, pilih fitur Scan QR, lalu arahkan kamera ke kode di atas.
            </p>

            {/* Simulation Button for Mock Mode */}
            {cache.payment.provider === "mock" && !isPaid && (
              <div style={{ marginBottom: "24px" }}>
                <button 
                  onClick={async () => {
                    setPolling(true);
                    // We wait a bit then poll manually
                    await new Promise(r => setTimeout(r, 1000));
                    void loadDetail();
                  }}
                  style={{ 
                    background: "linear-gradient(135deg, #0b4fd9, #38bdf8)", 
                    color: "white", 
                    border: "none", 
                    padding: "12px 24px", 
                    borderRadius: "12px", 
                    fontWeight: 800, 
                    cursor: "pointer", 
                    fontSize: "14px",
                    boxShadow: "0 4px 12px rgba(11, 79, 217, 0.3)"
                  }}
                >
                  🛠️ Simulasi Pembayaran Sukses
                </button>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {paymentLink && (
                <a href={paymentLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 24px", borderRadius: "12px", background: "linear-gradient(135deg, var(--primary), var(--accent))", color: "white", fontWeight: 800, fontSize: "16px", boxShadow: "0 8px 24px -4px rgba(11,79,217,0.35)" }}>
                  🔗 Buka Halaman Pembayaran
                </a>
              )}
              {isPaid && (
                <Link href={`/processing/${publicId}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 24px", borderRadius: "12px", background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 800, fontSize: "16px", border: "1px solid rgba(16,185,129,0.3)" }}>
                  ✅ Lihat Status Proses
                </Link>
              )}
              {!isPaid && !isFailed && !isExpired && (
                <button
                  onClick={() => void loadDetail()}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 24px", borderRadius: "12px", background: "var(--bg-alt)", color: "var(--text-muted)", fontWeight: 700, fontSize: "15px", border: "1px solid var(--border)", cursor: "pointer" }}
                >
                  {polling ? "⟳ Memeriksa status..." : "↻ Cek Status Pembayaran"}
                </button>
              )}
            </div>

            {/* Polling indicator */}
            {polling && !isPaid && !isExpired && (
              <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)", animation: "pulse 1.5s ease-in-out infinite" }} />
                Menunggu konfirmasi pembayaran secara otomatis...
              </div>
            )}
          </div>

          {/* Summary Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Order Summary */}
            <div style={{ background: "var(--surface)", borderRadius: "20px", border: "1px solid var(--border)", padding: "28px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "20px", color: "var(--text-main)", letterSpacing: "0.5px" }}>RINGKASAN ORDER</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Nama File", value: cache.fileName },
                  { label: "Paket", value: cache.package.name },
                  { label: "Harga Paket", value: formatRupiah(pricing.originalAmount) },
                  ...(pricing.voucherCode && pricing.discountPercent
                    ? [{
                        label: `Voucher ${pricing.voucherCode} (${pricing.discountPercent}%)`,
                        value: `-${formatRupiah(pricing.discountAmount)}`
                      }]
                    : []),
                  ...(cache.payment.fee ? [{ label: "Biaya Gateway", value: formatRupiah(cache.payment.fee) }] : []),
                  ...(typeof pricing.uniquePaymentCode === "number"
                    ? [{ label: "Kode Unik", value: formatRupiah(pricing.uniquePaymentCode) }]
                    : []),
                  { label: "Total Bayar", value: formatRupiah(total), highlight: true },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <span style={{ fontSize: "14px", color: "var(--text-muted)", flexShrink: 0 }}>{item.label}</span>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: (item as {highlight?: boolean}).highlight ? "var(--primary)" : "var(--text-main)", textAlign: "right", wordBreak: "break-all" }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Status</span>
                  <span style={{
                    padding: "4px 12px", borderRadius: "999px", fontSize: "13px", fontWeight: 800,
                    background: isPaid ? "rgba(16,185,129,0.1)" : isFailed || isExpired ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                    color: isPaid ? "#0b4fd9" : isFailed || isExpired ? "#ef4444" : "#64748b"
                  }}>
                    {isPaid ? "✓ Lunas" : isExpired ? "⌛ Expired" : isFailed ? "✗ Gagal" : "⌛ Menunggu"}
                  </span>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div style={{ background: "var(--surface)", borderRadius: "20px", border: "1px solid var(--border)", padding: "24px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "16px", color: "var(--text-main)", letterSpacing: "0.5px" }}>AKUN</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "16px", flexShrink: 0 }}>
                  {cache.user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-main)" }}>{cache.user.fullName}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{cache.user.email}</div>
                </div>
              </div>
            </div>

            {/* Invoice ref */}
            {cache.payment.providerRef && (
              <div style={{ background: "var(--bg-alt)", borderRadius: "16px", padding: "16px 20px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>NOMOR INVOICE</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", wordBreak: "break-all" }}>{cache.payment.providerRef}</div>
              </div>
            )}

            <Link href="/upload" style={{ textAlign: "center", fontSize: "14px", color: "var(--text-muted)", padding: "12px" }}>
              ← Kembali ke Upload
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 768px) {
          .payment-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
