"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl, formatRupiah, getStoredUserAuth, withCredentials } from "../lib/api";

type QuoteData = {
  package: { id: string; name: string; maxFileSizeMb: number; price: number };
  pricing: {
    originalAmount: number;
    discountAmount: number;
    discountPercent: number | null;
    finalAmount: number;
    voucherCode: string | null;
  };
};

type QuoteResponse = {
  success: boolean;
  message?: string;
  data?: QuoteData;
};

type UploadResponse = {
  success: boolean;
  message?: string;
  checkRequestId: string;
  package: { id: string; name: string; maxFileSizeMb: number; price: number };
  pricing: {
    originalAmount: number;
    discountAmount: number;
    discountPercent: number | null;
    finalAmount: number;
    voucherCode: string | null;
  };
  payment: {
    provider: string;
    providerRef: string;
    qrUrl: string | null;
    paymentLink: string | null;
    virtualAccount: string | null;
    amount: number;
    fee: number;
    total: number;
    expiredAt: string | null;
    status: string;
  };
};

type CheckerOptions = {
  excludeQuotes: boolean;
  excludeBiblio: boolean;
  excludeMatches: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const maxUploadSizeBytes = 10 * 1024 * 1024;
const uploadSizeErrorMessage = "Ukuran file PDF melebihi batas maksimum 10 MB. Silakan unggah file 10 MB atau lebih kecil.";

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
  const [activeVoucherCode, setActiveVoucherCode] = useState("");
  const [voucherNotice, setVoucherNotice] = useState("");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkerOptions, setCheckerOptions] = useState<CheckerOptions>({
    excludeQuotes: true,
    excludeBiblio: true,
    excludeMatches: ""
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const isFileTooLarge = useMemo(() => {
    if (!file) {
      return false;
    }

    return file.size > maxUploadSizeBytes;
  }, [file]);

  useEffect(() => {
    if (!file || isFileTooLarge) {
      setQuote(null);
      return;
    }

    const currentFile = file;
    const controller = new AbortController();
    const normalizedVoucherCode = appliedVoucherCode.trim();

    async function loadQuote() {
      setQuoteLoading(true);

      try {
        const response = await fetch(`${apiBaseUrl}/api/packages/quote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fileSizeBytes: currentFile.size,
            voucherCode: normalizedVoucherCode || undefined
          }),
          signal: controller.signal
        });

        const payload = (await response.json()) as QuoteResponse;
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Gagal menghitung paket.");
        }

        if (!payload.data) {
          throw new Error("Simulasi harga tidak tersedia.");
        }

        setQuote(payload.data);
        setVoucherNotice(payload.message || "");
        setActiveVoucherCode(payload.data.pricing.voucherCode || "");
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setQuote(null);
        setActiveVoucherCode("");
        setVoucherNotice("");
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat simulasi harga.");
      } finally {
        if (!controller.signal.aborted) {
          setQuoteLoading(false);
        }
      }
    }

    setError("");
    void loadQuote();

    return () => controller.abort();
  }, [file, appliedVoucherCode, isFileTooLarge]);

  function handleFileChange(selected: File | null) {
    setError("");
    setVoucherNotice("");
    setActiveVoucherCode("");
    setFile(selected);

    if (selected && selected.size > maxUploadSizeBytes) {
      setError(uploadSizeErrorMessage);
    }
  }

  function handleApplyVoucher() {
    setError("");
    setVoucherNotice("");
    setAppliedVoucherCode(voucherInput.trim().toUpperCase());
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") handleFileChange(dropped);
    else setError("Hanya file PDF yang diperbolehkan.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Pilih file PDF terlebih dahulu.");
      return;
    }

    if (isFileTooLarge) {
      setError(uploadSizeErrorMessage);
      return;
    }

    const auth = getStoredUserAuth();
    if (!auth?.user) {
      setError("Sesi login Anda tidak ditemukan. Silakan login ulang.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (activeVoucherCode.trim()) {
      formData.append("voucherCode", activeVoucherCode.trim());
    }

    formData.append("excludeQuotes", String(checkerOptions.excludeQuotes));
    formData.append("excludeBiblio", String(checkerOptions.excludeBiblio));
    if (checkerOptions.excludeMatches.trim()) {
      formData.append("excludeMatches", checkerOptions.excludeMatches.trim());
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/checks/upload`, {
        ...withCredentials(),
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Gagal membuat order pembayaran.");
      }

      sessionStorage.setItem(`payment:${payload.checkRequestId}`, JSON.stringify({
        user: auth.user,
        fileName: file.name,
        fileSizeBytes: file.size,
        package: payload.package,
        pricing: payload.pricing,
        payment: payload.payment
      }));
      router.push(`/payment/${encodeURIComponent(payload.checkRequestId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat upload.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "24px",
      border: "1px solid var(--border)", padding: "40px",
      boxShadow: "0 4px 24px rgba(0,0,0,0.04)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "40px" }}>
        {["Upload Dokumen", "Pembayaran", "Hasil Laporan"].map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                background: i === 0 ? "var(--primary)" : "var(--bg-alt)",
                border: i === 0 ? "none" : "2px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 800,
                color: i === 0 ? "white" : "var(--text-muted)",
                flexShrink: 0,
              }}>
                {i === 0 ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "12px", fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? "var(--primary)" : "var(--text-muted)",
                whiteSpace: "nowrap"
              }}>
                {step}
              </span>
            </div>
            {i < 2 && (
              <div style={{ flex: 1, height: "2px", background: "var(--border)", margin: "0 8px", marginBottom: "28px" }} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? "var(--primary)" : file ? "rgba(11,79,217,0.4)" : "var(--border)"}`,
            borderRadius: "16px",
            padding: "48px 32px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: isDragging ? "rgba(11,79,217,0.05)" : file ? "rgba(11,79,217,0.03)" : "var(--bg-alt)",
            marginBottom: "24px",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />

          {file ? (
            <div>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📄</div>
              <div style={{ fontWeight: 800, fontSize: "17px", color: "var(--text-main)", marginBottom: "6px" }}>
                {file.name}
              </div>
              <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                {formatFileSize(file.size)} &nbsp;·&nbsp;
                <span
                  style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 700 }}
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(""); }}
                >
                  Ganti file
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>☁️</div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-main)", marginBottom: "8px" }}>
                Klik atau seret file PDF ke sini
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Mendukung file PDF hingga 10 MB
              </div>
            </div>
          )}
        </div>

        {file && (
          <div style={{
            borderRadius: "14px", padding: "20px 24px", marginBottom: "24px",
            background: isFileTooLarge ? "rgba(239,68,68,0.07)" : "rgba(11,79,217,0.07)",
            border: `1px solid ${isFileTooLarge ? "rgba(239,68,68,0.2)" : "rgba(11,79,217,0.2)"}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: quote ? "14px" : 0 }}>
              <div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Paket terdeteksi otomatis
                </div>
                <div style={{ fontWeight: 800, fontSize: "16px", color: isFileTooLarge ? "#ef4444" : "var(--text-main)" }}>
                  {isFileTooLarge ? "⚠ File terlalu besar. Maksimal 10 MB." : quoteLoading ? "Menghitung paket..." : `PDF ≤ ${quote?.package.maxFileSizeMb ?? "?"} MB`}
                </div>
              </div>
              {!isFileTooLarge && quote && (
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {quote.pricing.discountAmount > 0 ? (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", textDecoration: "line-through", marginBottom: "2px" }}>
                      {formatRupiah(quote.pricing.originalAmount)}
                    </div>
                  ) : null}
                  <div style={{
                    fontSize: "24px", fontWeight: 900, color: "var(--primary)"
                  }}>
                    {formatRupiah(quote.pricing.finalAmount)}
                  </div>
                  {quote.pricing.voucherCode && quote.pricing.discountPercent ? (
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
                      HEMAT {quote.pricing.discountPercent}%
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {!isFileTooLarge && quote && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "var(--text-muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span>Harga paket</span>
                  <span style={{ textDecoration: quote.pricing.discountAmount > 0 ? "line-through" : "none" }}>
                    {formatRupiah(quote.pricing.originalAmount)}
                  </span>
                </div>
                {quote.pricing.voucherCode && quote.pricing.discountPercent ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: "#10b981", fontWeight: 700 }}>
                    <span>Voucher {quote.pricing.voucherCode} ({quote.pricing.discountPercent}%)</span>
                    <span>-{formatRupiah(quote.pricing.discountAmount)}</span>
                  </div>
                ) : null}
                {quote.pricing.discountAmount > 0 ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--text-main)", fontWeight: 800, paddingTop: "6px", borderTop: "1px dashed rgba(11,79,217,0.2)" }}>
                    <span>Harga setelah diskon</span>
                    <span style={{ color: "var(--primary)" }}>{formatRupiah(quote.pricing.finalAmount)}</span>
                  </div>
                ) : null}
              </div>
            )}

            {!isFileTooLarge && (
              <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px dashed rgba(11,79,217,0.2)" }}>
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px" }}>
                    Pengaturan Pengecekan
                  </div>
                  <div style={{ display: "grid", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--text-main)", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={checkerOptions.excludeQuotes}
                        onChange={(e) => setCheckerOptions((prev) => ({ ...prev, excludeQuotes: e.target.checked }))}
                      />
                      Kecualikan kutipan
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "var(--text-main)", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={checkerOptions.excludeBiblio}
                        onChange={(e) => setCheckerOptions((prev) => ({ ...prev, excludeBiblio: e.target.checked }))}
                      />
                      Kecualikan daftar pustaka
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "var(--text-main)", fontWeight: 600 }}>
                      Abaikan kecocokan
                      <input
                        type="text"
                        value={checkerOptions.excludeMatches}
                        onChange={(e) => setCheckerOptions((prev) => ({ ...prev, excludeMatches: e.target.value }))}
                        placeholder="Contoh: 1% atau 5 words"
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: "12px",
                          border: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.8)",
                          outline: "none",
                          fontSize: "14px",
                          color: "var(--text-main)"
                        }}
                      />
                    </label>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                      Isi dengan format seperti `1%` atau `5 words`. Kosongkan jika tidak ingin mengabaikan kecocokan tertentu.
                    </p>
                  </div>
                </div>

                <label htmlFor="voucherCode" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
                  Kode Voucher
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "10px" }}>
                  <input
                    id="voucherCode"
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Contoh: HEMAT10"
                    style={{
                      width: "100%",
                      padding: "15px 16px",
                      borderRadius: "14px",
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.8)",
                      outline: "none",
                      fontSize: "15px",
                      color: "var(--text-main)"
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={!file || quoteLoading}
                    style={{
                      padding: "0 18px",
                      borderRadius: "14px",
                      border: "none",
                      minWidth: "92px",
                      fontSize: "14px",
                      fontWeight: 800,
                      cursor: !file || quoteLoading ? "not-allowed" : "pointer",
                      background: !file || quoteLoading ? "var(--border)" : "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                      color: !file || quoteLoading ? "var(--text-muted)" : "white"
                    }}
                  >
                    Apply
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", lineHeight: 1.6 }}>
                  Masukkan kode lalu klik `Apply` untuk menghitung ulang harga otomatis.
                </p>
                {voucherNotice ? (
                  <div style={{
                    marginTop: "12px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.18)",
                    color: "#ef4444",
                    fontSize: "13px",
                    fontWeight: 700
                  }}>
                    ⚠ {voucherNotice}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            padding: "14px 18px", borderRadius: "12px", marginBottom: "20px",
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", fontSize: "14px", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !file || !!isFileTooLarge || quoteLoading || !quote}
          style={{
            width: "100%", padding: "18px", borderRadius: "14px", border: "none",
            fontSize: "17px", fontWeight: 800, cursor: "pointer",
            background: isSubmitting || !file || isFileTooLarge || quoteLoading || !quote
              ? "var(--border)"
              : "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
            color: isSubmitting || !file || isFileTooLarge || quoteLoading || !quote ? "var(--text-muted)" : "white",
            transition: "all 0.2s ease",
            boxShadow: !file || isFileTooLarge || isSubmitting || quoteLoading || !quote
              ? "none"
              : "0 8px 24px -4px rgba(11,79,217,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
          }}
        >
          {isSubmitting ? (
            <>
              <span style={{ display: "inline-block", width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Memproses...
            </>
          ) : (
            <> 🚀 Proses &amp; Lanjut Bayar</>
          )}
        </button>

        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", marginTop: "16px" }}>
          Sistem akan memeriksa ketersediaan layanan lalu mengarahkan Anda ke pembayaran QRIS
        </p>
      </form>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
