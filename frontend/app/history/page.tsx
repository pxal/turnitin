"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/hooks/useAuth";
import { useIsMobile } from "../../lib/hooks/useIsMobile";
import {
  apiBaseUrl,
  formatRupiah,
  getStoredUserAuth,
  historyVaultTimeoutMs,
  isHistoryVaultUnlocked,
  lockHistoryVault,
  unlockHistoryVault,
  withCredentials
} from "../../lib/api";
import AuthGuard from "../../components/auth-guard";

type CheckHistoryItem = {
  id: string;
  publicId: string;
  originalName: string;
  createdAt: string;
  paymentStatus: string;
  checkStatus: string;
  packageName: string;
  price: number;
};

type VaultStatus = {
  hasPin: boolean;
  updatedAt: string | null;
};

export default function HistoryPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [history, setHistory] = useState<CheckHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [vaultUnlocked, setVaultUnlockedState] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [vaultError, setVaultError] = useState("");
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultRemainingMs, setVaultRemainingMs] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unlocked = isHistoryVaultUnlocked(user.id);
    setVaultUnlockedState(unlocked);
    setVaultRemainingMs(unlocked ? historyVaultTimeoutMs : 0);

    async function fetchVaultStatus() {
      const auth = getStoredUserAuth();
      if (!auth?.user) {
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/history-pin/status`, withCredentials());
        const json = await res.json();
        if (json.success) {
          setVaultStatus(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    void fetchVaultStatus();
  }, [user]);

  useEffect(() => {
    if (!user || !vaultUnlocked) {
      setVaultRemainingMs(0);
      return;
    }

    const tick = () => {
      const unlocked = isHistoryVaultUnlocked(user.id);
      if (!unlocked) {
        lockHistoryVault(user.id);
        setVaultUnlockedState(false);
        setVaultRemainingMs(0);
        setVaultError("Sesi brankas riwayat berakhir. Masukkan PIN lagi untuk melanjutkan.");
        return;
      }

      const raw = window.sessionStorage.getItem(`turnicheck:history-vault:${user.id}`);
      if (!raw) {
        return;
      }

      try {
        const session = JSON.parse(raw) as { expiresAt?: number };
        setVaultRemainingMs(Math.max(0, (session.expiresAt || 0) - Date.now()));
      } catch {
        setVaultRemainingMs(0);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [user, vaultUnlocked]);

  useEffect(() => {
    if (!user || !vaultUnlocked || !vaultStatus?.hasPin) return;
    const userId = user.id;

    async function fetchHistory() {
      setLoading(true);
      try {
        const auth = getStoredUserAuth();
        const res = await fetch(`${apiBaseUrl}/api/checks/user/${userId}?page=${page}&limit=5`, {
          ...withCredentials()
        });
        const json = await res.json();
        if (json.success) {
          setHistory(json.data);
          setTotalPages(json.pagination.totalPages);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    void fetchHistory();
  }, [user, page, vaultUnlocked, vaultStatus?.hasPin]);

  async function handleSetupPin(e: React.FormEvent) {
    e.preventDefault();
    setVaultError("");
    setVaultLoading(true);

    try {
      const auth = getStoredUserAuth();
      const res = await fetch(`${apiBaseUrl}/api/auth/history-pin/setup`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pin,
          confirmPin
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menyimpan PIN.");
      }

      if (user) {
        unlockHistoryVault(user.id);
        setVaultUnlockedState(true);
        setVaultRemainingMs(historyVaultTimeoutMs);
      }
      setVaultStatus({
        hasPin: true,
        updatedAt: new Date().toISOString()
      });
      setPin("");
      setConfirmPin("");
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : "Gagal menyimpan PIN.");
    } finally {
      setVaultLoading(false);
    }
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    setVaultError("");
    setVaultLoading(true);

    try {
      const auth = getStoredUserAuth();
      const res = await fetch(`${apiBaseUrl}/api/auth/history-pin/verify`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pin })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "PIN salah.");
      }

      if (user) {
        unlockHistoryVault(user.id);
        setVaultUnlockedState(true);
        setVaultRemainingMs(historyVaultTimeoutMs);
      }
      setPin("");
    } catch (error) {
      setVaultError(error instanceof Error ? error.message : "Gagal membuka brankas.");
    } finally {
      setVaultLoading(false);
    }
  }

  function formatRemainingTime(ms: number) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function renderVaultPanel(options: {
    icon: string;
    title: string;
    description: string;
    submitLabel: string;
    loadingLabel: string;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    mode: "setup" | "verify";
  }) {
    return (
      <div className="vault-shell">
        <div className="vault-card">
          <div style={{ fontSize: "46px", marginBottom: "18px" }}>{options.icon}</div>
          <h2 style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: 900, marginBottom: "12px", color: "var(--text-main)", lineHeight: 1.2 }}>
            {options.title}
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: isMobile ? "20px" : "26px", lineHeight: 1.75, fontSize: isMobile ? "14px" : "15px" }}>
            {options.description}
          </p>
          <form onSubmit={options.onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder={options.mode === "setup" ? "PIN 4 digit" : "••••"}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={{
                padding: isMobile ? "16px 18px" : "18px 20px",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                fontSize: isMobile ? "18px" : "20px",
                letterSpacing: isMobile ? "8px" : "10px",
                textAlign: "center",
                background: "rgba(255,255,255,0.85)"
              }}
            />
            {options.mode === "setup" ? (
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Ulangi PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{
                  padding: isMobile ? "16px 18px" : "18px 20px",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  fontSize: isMobile ? "18px" : "20px",
                  letterSpacing: isMobile ? "8px" : "10px",
                  textAlign: "center",
                  background: "rgba(255,255,255,0.85)"
                }}
              />
            ) : null}
            {vaultError ? (
              <div style={{ color: "#dc2626", fontWeight: 700, fontSize: "14px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.14)", padding: "12px 14px", borderRadius: "12px" }}>
                {vaultError}
              </div>
            ) : null}
            <button
              className="button button-primary"
              type="submit"
              disabled={vaultLoading || pin.length !== 4 || (options.mode === "setup" && confirmPin.length !== 4)}
              style={{ width: "100%", justifyContent: "center", padding: isMobile ? "16px 20px" : "18px 24px", fontSize: isMobile ? "15px" : "17px" }}
            >
              {vaultLoading ? options.loadingLabel : options.submitLabel}
            </button>
          </form>
        </div>

        <div className="vault-info-card">
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "rgba(11,79,217,0.1)", color: "var(--primary)", fontWeight: 800, fontSize: "12px", letterSpacing: "0.6px", marginBottom: isMobile ? "14px" : "18px", alignSelf: "flex-start" }}>
            BRANKAS USER
          </div>
          <h3 style={{ fontSize: isMobile ? "20px" : "22px", fontWeight: 900, color: "var(--text-main)", marginBottom: "14px", lineHeight: 1.25 }}>
            Akses riwayat Anda lebih privat
          </h3>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.8, fontSize: isMobile ? "14px" : "15px", marginBottom: isMobile ? "18px" : "22px" }}>
            Setiap riwayat dokumen disimpan di balik PIN 4 digit agar hanya Anda yang bisa membuka daftar pemeriksaan dan status file.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "12px" : "14px" }}>
            {[
              "PIN terdiri dari 4 angka dan dibuat sekali saat setup awal.",
              `Brankas akan terkunci otomatis setelah ${Math.round(historyVaultTimeoutMs / 60000)} menit.`,
              "Riwayat tetap membutuhkan login Google dan verifikasi PIN."
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "var(--text-muted)", fontSize: isMobile ? "13px" : "14px", lineHeight: 1.7 }}>
                <span style={{ color: "var(--primary)", fontWeight: 900 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          {vaultStatus?.updatedAt ? (
            <div style={{ marginTop: isMobile ? "18px" : "24px", paddingTop: "18px", borderTop: "1px solid var(--border)", fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>
              PIN terakhir diperbarui pada {new Date(vaultStatus.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <main style={{ minHeight: "100vh", padding: "100px 0 80px", background: "var(--bg-main)" }}>
        <div className="container">
          <div style={{ maxWidth: "760px", marginBottom: isMobile ? "32px" : "44px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(11,79,217,0.08)", color: "var(--primary)", border: "1px solid rgba(11,79,217,0.16)", borderRadius: "999px", padding: "8px 14px", fontSize: "12px", fontWeight: 800, letterSpacing: "0.6px", marginBottom: "18px" }}>
              RIWAYAT TERLINDUNGI
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 900, marginBottom: "10px", lineHeight: 1.1 }}>Brankas Riwayat</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "17px", lineHeight: 1.7 }}>
              Riwayat dokumen Anda dilindungi PIN 4 digit sebelum bisa dibuka. Tata letak ini membantu akses tetap nyaman tanpa mengorbankan privasi.
            </p>
            {vaultUnlocked ? (
              <div style={{ marginTop: "18px", display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(11,79,217,0.08)", color: "#0b4fd9", border: "1px solid rgba(11,79,217,0.16)", borderRadius: "999px", padding: "8px 14px", fontSize: "12px", fontWeight: 800, letterSpacing: "0.4px" }}>
                Sesi brankas aktif • terkunci otomatis dalam {formatRemainingTime(vaultRemainingMs)}
              </div>
            ) : null}
          </div>

          {!vaultStatus?.hasPin ? (
            renderVaultPanel({
              icon: "🔐",
              title: "Buat PIN Brankas",
              description: "Sebelum membuka riwayat, Anda wajib membuat PIN 4 angka terlebih dahulu. PIN ini akan dipakai setiap kali membuka brankas riwayat.",
              submitLabel: "Simpan PIN Brankas",
              loadingLabel: "Menyimpan PIN...",
              onSubmit: handleSetupPin,
              mode: "setup"
            })
          ) : !vaultUnlocked ? (
            renderVaultPanel({
              icon: "🗄️",
              title: "Masukkan PIN Brankas",
              description: "Riwayat Anda terkunci. Masukkan PIN 4 digit untuk membuka brankas user dan mengakses daftar dokumen sebelumnya.",
              submitLabel: "Buka Brankas",
              loadingLabel: "Membuka...",
              onSubmit: handleVerifyPin,
              mode: "verify"
            })
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>Memuat riwayat...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 40px", background: "var(--surface)", borderRadius: "24px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px" }}>📭</div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>Belum Ada Riwayat</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: "32px" }}>Anda belum pernah mengunggah dokumen untuk dicek.</p>
              <Link href="/upload" className="button button-primary">Mulai Cek Sekarang</Link>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
                {history.map((item) => (
                  <div key={item.id} style={{
                    background: "var(--surface)",
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    padding: isMobile ? "18px" : "24px",
                    display: "flex",
                    alignItems: isMobile ? "stretch" : "center",
                    justifyContent: "space-between",
                    flexDirection: isMobile ? "column" : "row",
                    gap: isMobile ? "16px" : "20px",
                    transition: "transform 0.2s ease",
                  }} className="history-card">
                    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "14px" : "20px" }}>
                      <div style={{ width: isMobile ? "48px" : "56px", height: isMobile ? "48px" : "56px", borderRadius: isMobile ? "14px" : "16px", background: "rgba(11,79,217,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "20px" : "24px", flexShrink: 0 }}>
                        📄
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ fontSize: isMobile ? "15px" : "17px", fontWeight: 800, marginBottom: "4px", wordBreak: "break-word" }}>{item.originalName}</h3>
                        <div style={{ display: "flex", gap: isMobile ? "8px" : "12px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{new Date(item.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span style={{ width: "4px", height: "4px", background: "var(--border)", borderRadius: "50%" }}></span>
                          <span style={{ fontSize: "13px", color: "var(--primary)", fontWeight: 700 }}>{formatRupiah(item.price)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "space-between", gap: isMobile ? "12px" : "24px", flexDirection: isMobile ? "column" : "row" }}>
                      <div style={{ textAlign: isMobile ? "left" : "right" }}>
                        <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</div>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "99px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: item.checkStatus === "COMPLETED" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color: item.checkStatus === "COMPLETED" ? "#0b4fd9" : "#64748b"
                        }}>
                          {item.checkStatus === "WAITING_PAYMENT" ? "Menunggu Pembayaran" :
                           item.checkStatus === "PAID" ? "Terbayar" :
                           item.checkStatus === "PROCESSING" ? "Sedang Diproses" :
                           item.checkStatus === "COMPLETED" ? "Selesai" : item.checkStatus}
                        </span>
                      </div>

                      <Link
                        href={item.paymentStatus === "PAID" ? `/processing/${item.publicId}` : `/payment/${item.publicId}`}
                        className="button"
                        style={{
                          padding: isMobile ? "12px 16px" : "10px 20px",
                          fontSize: "14px",
                          background: "var(--bg-alt)",
                          border: "1px solid var(--border)",
                          fontWeight: 700,
                          width: isMobile ? "100%" : "auto"
                        }}
                      >
                        Buka Kembali
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flexDirection: isMobile ? "column" : "row" }}>
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{
                      padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                      background: "white", cursor: page === 1 ? "not-allowed" : "pointer",
                      opacity: page === 1 ? 0.5 : 1, fontWeight: 700, fontSize: "14px",
                      width: isMobile ? "100%" : "auto"
                    }}
                  >
                    ← Sebelumnya
                  </button>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                    Halaman {page} dari {totalPages}
                  </div>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                      background: "white", cursor: page === totalPages ? "not-allowed" : "pointer",
                      opacity: page === totalPages ? 0.5 : 1, fontWeight: 700, fontSize: "14px",
                      width: isMobile ? "100%" : "auto"
                    }}
                  >
                    Selanjutnya →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <style>{`
        .vault-shell {
          display: grid;
          grid-template-columns: minmax(0, 520px) minmax(280px, 380px);
          gap: 28px;
          align-items: stretch;
          margin-bottom: 24px;
          width: 100%;
          min-width: 0;
        }

        .vault-card,
        .vault-info-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 32px;
          box-shadow: 0 20px 50px -30px rgba(15, 23, 42, 0.18);
          width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .history-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
          box-shadow: 0 10px 30px -10px rgba(11, 79, 217, 0.15);
        }

        @media (max-width: 960px) {
          .vault-shell {
            grid-template-columns: 1fr;
            gap: 18px;
            width: 100%;
          }

          .vault-card,
          .vault-info-card {
            padding: 24px;
          }
        }

        @media (max-width: 640px) {
          .vault-shell {
            margin-bottom: 18px;
            width: 100%;
          }

          .vault-card,
          .vault-info-card {
            border-radius: 22px;
            padding: 20px;
            width: 100%;
            max-width: 100%;
          }

          .vault-card h2,
          .vault-info-card h3,
          .vault-card p,
          .vault-info-card p,
          .vault-info-card div,
          .vault-card form,
          .vault-card input,
          .vault-card button {
            max-width: 100%;
            min-width: 0;
          }
        }
      `}</style>
    </AuthGuard>
  );
}
