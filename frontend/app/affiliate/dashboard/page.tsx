"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AffiliatePageShell from "../../../components/affiliate/page-shell";
import {
  apiBaseUrl,
  clearAffiliateSession,
  formatRupiah,
  getStoredAffiliateAuth,
  storeAffiliateSession,
  withCredentials
} from "../../../lib/api";
import { useAffiliateAuth } from "../../../lib/hooks/useAffiliateAuth";
import ActionDialog from "../../../components/ui/action-dialog";

type DashboardPayload = {
  success: boolean;
  data?: {
    affiliate: {
      id: string;
      email: string;
      username: string;
      voucherCode: string;
      voucherDiscountPercent: number;
      commissionAmount: number;
      bankName?: string | null;
      bankAccountName?: string | null;
      bankAccountNumber?: string | null;
      createdAt: string;
    };
    stats: {
      paidOrdersCount: number;
      totalCommission: number;
      totalWithdrawn: number;
      availableCommission: number;
    };
    recentOrders: Array<{
      id: string;
      publicId: string;
      originalName: string;
      finalAmount: number;
      affiliateCommissionAmount: number;
      discountCode: string | null;
      createdAt: string;
      paymentStatus: string;
      checkStatus: string;
      user: {
        fullName: string;
        email: string;
      };
    }>;
    withdrawals: Array<{
      id: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
    recentOrdersPagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
    withdrawalsPagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  };
  message?: string;
};

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
};

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext
}: PaginationControlsProps) {
  if (totalItems <= 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        marginTop: "18px"
      }}
    >
      <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 700 }}>
        Halaman {page} dari {Math.max(1, totalPages)}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "white",
            color: "var(--text-main)",
            fontWeight: 800,
            cursor: page <= 1 ? "not-allowed" : "pointer",
            opacity: page <= 1 ? 0.5 : 1
          }}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "white",
            color: "var(--text-main)",
            fontWeight: 800,
            cursor: page >= totalPages ? "not-allowed" : "pointer",
            opacity: page >= totalPages ? 0.5 : 1
          }}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ 
  title, 
  description, 
  icon, 
  color 
}: { 
  title: string; 
  description?: string; 
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: description ? "6px" : 0 }}>
        {icon ? (
          <div style={{ color: color || "var(--primary)", display: "flex", alignItems: "center" }}>
            {icon}
          </div>
        ) : null}
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: color || "var(--text-main)" }}>
          {title}
        </h2>
      </div>
      {description ? (
        <p style={{ color: color ? "rgba(255,255,255,0.7)" : "var(--text-muted)", lineHeight: 1.7, fontSize: "14px", maxWidth: "500px" }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const { affiliate, loading: authLoading, logout } = useAffiliateAuth();
  const [dashboard, setDashboard] = useState<DashboardPayload["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: ""
  });
  const [withdrawAmount, setWithdrawAmount] = useState(1000);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "logout" | "regenerate" | "withdraw">(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);

  async function fetchDashboard(nextOrdersPage = ordersPage, nextWithdrawalsPage = withdrawalsPage) {
    try {
      const query = new URLSearchParams({
        ordersPage: String(nextOrdersPage),
        ordersLimit: "5",
        withdrawalsPage: String(nextWithdrawalsPage),
        withdrawalsLimit: "5"
      });
      const response = await fetch(`${apiBaseUrl}/api/affiliate/dashboard?${query.toString()}`, withCredentials());
      const payload = (await response.json()) as DashboardPayload;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Gagal memuat dashboard affiliate.");
      }

      setDashboard(payload.data);
      setOrdersPage(payload.data.recentOrdersPagination.page);
      setWithdrawalsPage(payload.data.withdrawalsPagination.page);
      setBankForm({
        bankName: payload.data.affiliate.bankName || "",
        bankAccountName: payload.data.affiliate.bankAccountName || "",
        bankAccountNumber: payload.data.affiliate.bankAccountNumber || ""
      });

      const stored = getStoredAffiliateAuth()?.affiliate;
      if (stored) {
        storeAffiliateSession({
          ...stored,
          voucherCode: payload.data.affiliate.voucherCode,
          voucherDiscountPercent: payload.data.affiliate.voucherDiscountPercent,
          commissionAmount: payload.data.affiliate.commissionAmount,
          bankName: payload.data.affiliate.bankName,
          bankAccountName: payload.data.affiliate.bankAccountName,
          bankAccountNumber: payload.data.affiliate.bankAccountNumber
        });
      }
    } catch (error) {
      if (!getStoredAffiliateAuth()?.affiliate) {
        clearAffiliateSession();
        router.replace("/affiliate/login");
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "Dashboard affiliate sedang gagal dimuat. Silakan coba refresh."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !affiliate) {
      router.replace("/affiliate/login");
      return;
    }

    if (affiliate) {
      void fetchDashboard(ordersPage, withdrawalsPage);
    }
  }, [affiliate, authLoading, router]);

  const stats = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        label: "Voucher Aktif",
        value: dashboard.affiliate.voucherCode,
        helper: `${dashboard.affiliate.voucherDiscountPercent}% diskon`,
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5h-2a2 2 0 0 1-2-2V2H9v1a2 2 0 0 1-2 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M12 17v-6"/><path d="M9 14l3-3 3 3"/></svg>
        ),
        bg: "linear-gradient(135deg, rgba(11,79,217,0.1), rgba(11,79,217,0.02))",
        color: "var(--primary)"
      },
      {
        label: "Order Lunas",
        value: dashboard.stats.paidOrdersCount.toString(),
        helper: "Total komisi terkumpul",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M17 11l2 2 4-4"/></svg>
        ),
        bg: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.02))",
        color: "#38bdf8"
      },
      {
        label: "Komisi Tersedia",
        value: formatRupiah(dashboard.stats.availableCommission),
        helper: "Siap dicairkan",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        ),
        bg: "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.02))",
        color: "#eab308"
      },
      {
        label: "Total Withdraw",
        value: formatRupiah(dashboard.stats.totalWithdrawn),
        helper: "Telah dibayarkan",
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        ),
        bg: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(236,72,153,0.02))",
        color: "var(--accent)"
      }
    ];
  }, [dashboard]);

  async function handleSaveBankAccount(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/affiliate/bank-account`, {
        ...withCredentials(),
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bankForm)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Gagal menyimpan rekening.");
      }

      setMessage("Data rekening affiliate berhasil disimpan.");
      await fetchDashboard(ordersPage, withdrawalsPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan rekening.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/affiliate/withdrawals`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: withdrawAmount })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Pengajuan withdraw gagal.");
      }

      setMessage("Pengajuan withdraw berhasil dibuat dan sedang menunggu review admin.");
      await fetchDashboard(ordersPage, 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pengajuan withdraw gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegenerateVoucher() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/affiliate/voucher/regenerate`, {
        ...withCredentials(),
        method: "POST"
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Gagal membuat voucher baru.");
      }

      setMessage("Voucher affiliate baru berhasil dibuat.");
      await fetchDashboard(ordersPage, withdrawalsPage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal membuat voucher baru.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "40px", height: "40px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin-slow 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Memuat Panel Affiliate...</p>
        </div>
      </main>
    );
  }

  if (!affiliate || !dashboard) {
    return null;
  }

  return (
    <AffiliatePageShell maxWidth="1300px">
      <ActionDialog
        open={pendingAction === "logout"}
        title="Keluar dari Dashboard Affiliate"
        description="Sesi affiliate akan diakhiri di browser ini. Anda bisa login kembali kapan saja."
        confirmLabel="Ya, keluar"
        cancelLabel="Tetap di sini"
        confirmTone="danger"
        busy={submitting}
        onClose={() => setPendingAction(null)}
        onConfirm={async () => {
          setSubmitting(true);
          try {
            await logout();
            router.push("/affiliate/login");
          } finally {
            setSubmitting(false);
            setPendingAction(null);
          }
        }}
      />

      <ActionDialog
        open={pendingAction === "regenerate"}
        title="Generate Voucher Baru"
        description="Voucher lama akan dinonaktifkan dan diganti dengan kode baru. Pastikan Anda siap memperbarui semua materi promosi yang sudah dibagikan."
        confirmLabel="Generate voucher baru"
        cancelLabel="Batal"
        busy={submitting}
        onClose={() => setPendingAction(null)}
        onConfirm={async () => {
          await handleRegenerateVoucher();
          setPendingAction(null);
        }}
      />

      <ActionDialog
        open={pendingAction === "withdraw"}
        title="Konfirmasi Withdraw"
        description={`Anda akan mengajukan pencairan komisi sebesar ${formatRupiah(withdrawAmount)} ke rekening yang saat ini tersimpan.`}
        confirmLabel="Ajukan withdraw"
        cancelLabel="Periksa lagi"
        busy={submitting}
        onClose={() => setPendingAction(null)}
        onConfirm={async () => {
          const fakeEvent = { preventDefault() {} } as React.FormEvent;
          await handleWithdraw(fakeEvent);
          setPendingAction(null);
        }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.7px", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Rekening Tujuan</div>
            <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 700, lineHeight: 1.7 }}>
              {[dashboard.affiliate.bankName, dashboard.affiliate.bankAccountName, dashboard.affiliate.bankAccountNumber].filter(Boolean).join(" • ") || "Belum ada rekening tersimpan"}
            </div>
          </div>
          <div style={{ background: "#eef4ff", border: "1px solid #bfdbfe", borderRadius: "16px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.7px", color: "#0b4fd9", textTransform: "uppercase", marginBottom: "6px" }}>Saldo Tersedia</div>
            <div style={{ fontSize: "16px", color: "#0b4fd9", fontWeight: 900 }}>{formatRupiah(dashboard.stats.availableCommission)}</div>
          </div>
        </div>
      </ActionDialog>

      <div className="affiliate-dashboard animate-fade-up">
        {/* Header Hero */}
        <section className="affiliate-hero glass">
          <div style={{ position: "absolute", top: 0, right: 0, width: "300px", height: "100%", background: "linear-gradient(270deg, rgba(11,79,217,0.05), transparent)", zIndex: 0 }} />
          
          <div className="affiliate-hero-copy" style={{ position: "relative", zIndex: 1 }}>
            <div className="affiliate-eyebrow">CONTROL PANEL</div>
            <h1 className="text-gradient">Halo, {dashboard.affiliate.username}!</h1>
            <p>
              Selamat datang kembali di dashboard partner Verscan. Pantau perkembangan bisnis Anda secara realtime.
            </p>
            <div className="affiliate-inline-meta">
              <div className="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {dashboard.affiliate.email}
              </div>
              <div className="meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Bergabung {new Date(dashboard.affiliate.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>

          <div className="affiliate-hero-side" style={{ position: "relative", zIndex: 1 }}>
            <button
              type="button"
              className="button button-outline affiliate-logout-button"
              style={{ padding: "12px", background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.1)", color: "#dc2626" }}
              onClick={() => setPendingAction("logout")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar Sesi
            </button>
          </div>
        </section>

        {message ? (
          <div className="affiliate-notice animate-scale-up" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {message}
          </div>
        ) : null}

        {/* Stats Grid */}
        <section className="affiliate-stats-grid">
          {stats.map((item, idx) => (
            <article key={item.label} className="affiliate-stat-card glass" style={{ background: item.bg, animationDelay: `${idx * 0.1}s` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ 
                  width: "42px", 
                  height: "42px", 
                  borderRadius: "12px", 
                  background: "white", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: item.color,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
                }}>
                  {item.icon}
                </div>
                <div style={{ color: item.color, fontSize: "12px", fontWeight: 800, background: "rgba(255,255,255,0.5)", padding: "4px 10px", borderRadius: "99px", height: "fit-content" }}>
                  ↑ 12%
                </div>
              </div>
              <div className="affiliate-stat-label">{item.label}</div>
              <div className="affiliate-stat-value" style={{ color: "var(--text-main)" }}>
                {item.value}
              </div>
              <div className="affiliate-stat-helper">{item.helper}</div>
            </article>
          ))}
        </section>

        {/* Main Content */}
        <div className="affiliate-main-grid">
          {/* Left Column */}
          <div style={{ display: "grid", gap: "24px", alignContent: "start" }}>
            <article className="affiliate-card glass">
              <div className="affiliate-card-header">
                <SectionTitle
                  title="Voucher Anda"
                  description="Gunakan kode ini untuk mendapatkan komisi dari setiap transaksi lunas."
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>}
                />
                <button
                  type="button"
                  className="button button-outline"
                  style={{ fontSize: "13px", padding: "10px 16px" }}
                  onClick={() => setPendingAction("regenerate")}
                  disabled={submitting}
                >
                  Generate Baru
                </button>
              </div>

              <div className="affiliate-voucher-display">
                 <div className="voucher-code">{dashboard.affiliate.voucherCode}</div>
                 <button className="copy-btn" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(dashboard.affiliate.voucherCode);
                      setMessage("Kode voucher berhasil disalin ke clipboard.");
                    } catch {
                      setMessage("Clipboard browser tidak tersedia. Silakan salin kode voucher secara manual.");
                    }
                 }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                   Salin
                 </button>
              </div>

              <div className="affiliate-voucher-strip">
                <div className="glass" style={{ background: "rgba(255,255,255,0.4)" }}>
                  <span>DISKON CUSTOMER</span>
                  <strong>{dashboard.affiliate.voucherDiscountPercent}% OFF</strong>
                </div>
                <div className="glass" style={{ background: "rgba(255,255,255,0.4)" }}>
                  <span>KOMISI ANDA</span>
                  <strong>{formatRupiah(dashboard.affiliate.commissionAmount)}</strong>
                </div>
              </div>
            </article>

            <article className="affiliate-card glass">
              <SectionTitle
                title="Transaksi Terbaru"
                description="List order yang menggunakan kode voucher Anda."
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
              />
              
              <div className="affiliate-list">
                {dashboard.recentOrders.length === 0 ? (
                  <div className="affiliate-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <p>Belum ada transaksi ditemukan.</p>
                  </div>
                ) : (
                  dashboard.recentOrders.map((order) => (
                    <div key={order.id} className="affiliate-list-item glass">
                      <div className="affiliate-order-top">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                            {order.user.fullName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="affiliate-order-user">{order.user.fullName}</div>
                            <div className="affiliate-order-email">{order.user.email}</div>
                          </div>
                        </div>
                        <div className="affiliate-order-commission">+{formatRupiah(order.affiliateCommissionAmount)}</div>
                      </div>

                      <div className="affiliate-order-file">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "8px" }}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                        {order.originalName}
                      </div>

                      <div className="affiliate-order-meta">
                        <span className="meta-tag">{formatRupiah(order.finalAmount)}</span>
                        <span className="meta-tag">{new Date(order.createdAt).toLocaleDateString("id-ID")}</span>
                      </div>

                      <div className="affiliate-order-tags">
                        <span className="affiliate-tag affiliate-tag-primary">{order.discountCode || dashboard.affiliate.voucherCode}</span>
                        <span className={`affiliate-tag ${order.paymentStatus === "PAID" ? "affiliate-tag-success" : "affiliate-tag-warning"}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <PaginationControls
                page={dashboard.recentOrdersPagination.page}
                totalPages={dashboard.recentOrdersPagination.totalPages}
                totalItems={dashboard.recentOrdersPagination.totalItems}
                onPrevious={() => void fetchDashboard(Math.max(1, dashboard.recentOrdersPagination.page - 1), withdrawalsPage)}
                onNext={() =>
                  void fetchDashboard(
                    Math.min(dashboard.recentOrdersPagination.totalPages, dashboard.recentOrdersPagination.page + 1),
                    withdrawalsPage
                  )
                }
              />
            </article>
          </div>

          {/* Right Column */}
          <div style={{ display: "grid", gap: "24px", alignContent: "start" }}>
            <article className="affiliate-card glass" style={{ background: "var(--bg-dark)", color: "white" }}>
              <SectionTitle
                title="Pencairan Komisi"
                description="Tarik saldo Anda ke rekening terdaftar."
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                color="white"
              />
              <form onSubmit={(e) => {
                e.preventDefault();
                setPendingAction("withdraw");
              }} className="affiliate-form-grid">
                <div className="field">
                  <label style={{ color: "rgba(255,255,255,0.6)" }}>Nominal Penarikan</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                  />
                </div>
                <div className="affiliate-inline-box" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Saldo Tersedia</span>
                  <strong style={{ color: "var(--primary-light)" }}>{formatRupiah(dashboard.stats.availableCommission)}</strong>
                </div>
                <button type="submit" className="button button-primary" style={{ width: "100%", padding: "16px" }} disabled={submitting}>
                  Ajukan Withdraw
                </button>
              </form>
            </article>

            <article className="affiliate-card glass">
              <SectionTitle
                title="Info Rekening"
                description="Update data bank tujuan Anda."
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}
              />
              <form onSubmit={handleSaveBankAccount} className="affiliate-form-grid">
                <div className="field">
                  <label>Nama Bank</label>
                  <input
                    placeholder="BCA, Mandiri, dll"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Atas Nama</label>
                  <input
                    placeholder="Nama Lengkap"
                    value={bankForm.bankAccountName}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankAccountName: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>No. Rekening</label>
                  <input
                    placeholder="0000000000"
                    value={bankForm.bankAccountNumber}
                    onChange={(e) => setBankForm((prev) => ({ ...prev, bankAccountNumber: e.target.value }))}
                  />
                </div>
                <button type="submit" className="button button-outline" style={{ width: "100%", padding: "14px" }} disabled={submitting}>
                  Update Rekening
                </button>
              </form>
            </article>

            <article className="affiliate-card glass">
              <SectionTitle
                title="Riwayat Withdraw"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
              />
              <div className="affiliate-list">
                {dashboard.withdrawals.length === 0 ? (
                  <div className="affiliate-empty-state">Belum ada riwayat.</div>
                ) : (
                  dashboard.withdrawals.map((item) => (
                    <div key={item.id} className="affiliate-withdraw-item glass" style={{ background: "rgba(255,255,255,0.4)" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "16px" }}>{formatRupiah(item.amount)}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{new Date(item.createdAt).toLocaleDateString("id-ID")}</div>
                      </div>
                      <span className={`affiliate-tag ${item.status === "COMPLETED" ? "affiliate-tag-success" : "affiliate-tag-warning"}`}>
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <PaginationControls
                page={dashboard.withdrawalsPagination.page}
                totalPages={dashboard.withdrawalsPagination.totalPages}
                totalItems={dashboard.withdrawalsPagination.totalItems}
                onPrevious={() => void fetchDashboard(ordersPage, Math.max(1, dashboard.withdrawalsPagination.page - 1))}
                onNext={() =>
                  void fetchDashboard(
                    ordersPage,
                    Math.min(dashboard.withdrawalsPagination.totalPages, dashboard.withdrawalsPagination.page + 1)
                  )
                }
              />
            </article>
          </div>
        </div>
      </div>

      <style>{`
        .affiliate-dashboard {
          display: grid;
          gap: 24px;
          padding-bottom: 40px;
        }

        .affiliate-hero {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 40px;
          align-items: center;
          padding: 40px;
          border-radius: 40px;
          position: relative;
          overflow: hidden;
        }

        .affiliate-hero-copy h1 {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 900;
          margin-bottom: 12px;
        }

        .affiliate-hero-copy p {
          color: var(--text-muted);
          font-size: 18px;
          line-height: 1.6;
          max-width: 600px;
        }

        .affiliate-eyebrow {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(11,79,217,0.1);
          color: var(--primary);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 20px;
        }

        .affiliate-inline-meta {
          display: flex;
          gap: 20px;
          margin-top: 24px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .affiliate-hero-side {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
        }

        .affiliate-logout-button {
          min-width: 170px;
          justify-content: center;
          align-self: center;
        }

        .affiliate-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .affiliate-stat-card {
          padding: 28px;
          border-radius: 32px;
        }

        .affiliate-stat-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .affiliate-stat-value {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .affiliate-stat-helper {
          font-size: 13px;
          color: var(--text-muted);
        }

        .affiliate-main-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          align-items: start;
        }

        .affiliate-card {
          padding: 32px;
          border-radius: 36px;
        }

        .affiliate-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .affiliate-voucher-display {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .voucher-code {
          flex: 1;
          background: linear-gradient(135deg, var(--bg-main), white);
          padding: 24px;
          border-radius: 20px;
          border: 2px dashed var(--primary);
          text-align: center;
          font-size: 32px;
          font-weight: 900;
          color: var(--primary);
          letter-spacing: 2px;
        }

        .copy-btn {
          padding: 24px;
          border-radius: 20px;
          background: var(--bg-main);
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          background: white;
          border-color: var(--primary);
          color: var(--primary);
        }

        .affiliate-voucher-strip {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .affiliate-voucher-strip div {
          padding: 20px;
          border-radius: 20px;
          text-align: center;
        }

        .affiliate-voucher-strip span {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .affiliate-voucher-strip strong {
          font-size: 20px;
          font-weight: 900;
        }

        .affiliate-list {
          display: grid;
          gap: 16px;
        }

        .affiliate-list-item {
          padding: 20px;
          border-radius: 24px;
          background: rgba(255,255,255,0.4);
        }

        .affiliate-order-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .affiliate-order-user {
          font-weight: 800;
          font-size: 16px;
        }

        .affiliate-order-email {
          font-size: 13px;
          color: var(--text-muted);
        }

        .affiliate-order-commission {
          font-size: 18px;
          font-weight: 900;
          color: #38bdf8;
        }

        .affiliate-order-file {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
        }

        .affiliate-order-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .meta-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(255,255,255,0.6);
          padding: 4px 10px;
          border-radius: 6px;
        }

        .affiliate-order-tags {
          display: flex;
          gap: 10px;
        }

        .affiliate-tag {
          font-size: 11px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 99px;
          text-transform: uppercase;
        }

        .affiliate-tag-primary { background: rgba(11,79,217,0.1); color: var(--primary); }
        .affiliate-tag-success { background: rgba(56,189,248,0.1); color: #38bdf8; }
        .affiliate-tag-warning { background: rgba(234,179,8,0.1); color: #ca8a04; }

        .affiliate-withdraw-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-radius: 16px;
        }

        .affiliate-empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          font-weight: 600;
        }

        .affiliate-notice {
          padding: 16px 24px;
          border-radius: 16px;
          background: var(--bg-dark);
          color: white;
          font-weight: 700;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        @media (max-width: 1200px) {
          .affiliate-stats-grid { grid-template-columns: 1fr 1fr; }
          .affiliate-main-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 800px) {
          .affiliate-hero { grid-template-columns: 1fr; padding: 32px; }
          .affiliate-hero-side {
            justify-content: flex-start;
            margin-top: 8px;
          }
        }

        @media (max-width: 600px) {
          .affiliate-stats-grid { grid-template-columns: 1fr; }
          .affiliate-hero-side {
            justify-content: center;
            align-items: stretch;
          }
          .affiliate-logout-button {
            width: 100%;
            min-width: 0;
          }
          .affiliate-voucher-strip { grid-template-columns: 1fr; }
          .affiliate-voucher-display { flex-direction: column; }
          .copy-btn { width: 100%; flex-direction: row; padding: 16px; }
        }
      `}</style>
    </AffiliatePageShell>
  );
}
