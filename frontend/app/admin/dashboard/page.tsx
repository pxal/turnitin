"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiBaseUrl, clearAdminSession, formatRupiah, withCredentials } from "../../../lib/api";
import { BRANDING_UPDATED_EVENT } from "../../../lib/hooks/useBranding";
import { useIsMobile } from "../../../lib/hooks/useIsMobile";

type DashboardData = {
  users: number;
  requests: number;
  completed: number;
  failed: number;
  totalEarnings: number;
  recentRequests: Array<{
    id: string;
    paymentStatus: string;
    finalAmount: number;
    createdAt: string;
    user: { fullName: string };
    package: { name: string };
  }>;
};

type BrandingData = {
  brandName: string;
  logoUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  whatsappUrl?: string;
};

const emptyBrandingForm: BrandingData = {
  brandName: "Verscan",
  logoUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  whatsappUrl: ""
};

const styles = {
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
  } as const,
  title: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a"
  } as const,
  muted: {
    color: "#64748b"
  } as const,
  button: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px"
  } as const,
  input: {
    width: "100%",
    height: "42px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "0 14px",
    fontFamily: "inherit",
    fontSize: "14px",
    outline: "none"
  } as const
};

function SectionHeader({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "18px",
        flexWrap: "wrap"
      }}
    >
      <div>
        <h3 style={{ ...styles.title, fontSize: "18px" }}>{title}</h3>
        {subtitle ? <p style={{ ...styles.muted, fontSize: "13px", marginTop: "4px" }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function getPaymentTone(status: string) {
  if (status === "PAID") {
    return { background: "#dcfce7", color: "#166534" };
  }

  if (status === "PROCESSING") {
    return { background: "#fef3c7", color: "#92400e" };
  }

  return { background: "#f1f5f9", color: "#475569" };
}

function formatWibDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [serverTime, setServerTime] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [brandingForm, setBrandingForm] = useState(emptyBrandingForm);
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null);
  const [brandingLogoPreviewUrl, setBrandingLogoPreviewUrl] = useState("");

  useEffect(() => {
    if (!brandingLogoFile) {
      setBrandingLogoPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(brandingLogoFile);
    setBrandingLogoPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [brandingLogoFile]);

  useEffect(() => {
    setServerTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    const timer = window.setInterval(() => {
      setServerTime(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/dashboard`, withCredentials());
      const json = await res.json();

      if (res.status === 401 || res.status === 403) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!res.ok) {
        throw new Error(json.message || "Akses admin ditolak.");
      }

      setData(json);

      const brandingRes = await fetch(`${apiBaseUrl}/api/admin/branding`, withCredentials());
      const brandingJson = await brandingRes.json();
      if (brandingRes.ok && brandingJson.success) {
        setBrandingForm(brandingJson.data);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gagal memuat dashboard admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDashboard();
  }, []);

  async function handleBrandingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const brandingResponse = await fetch(`${apiBaseUrl}/api/admin/branding`, {
        ...withCredentials(),
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          brandName: brandingForm.brandName,
          logoUrl: brandingForm.logoUrl || "",
          instagramUrl: brandingForm.instagramUrl || "",
          tiktokUrl: brandingForm.tiktokUrl || "",
          whatsappUrl: brandingForm.whatsappUrl || ""
        })
      });
      const brandingPayload = await brandingResponse.json();

      if (!brandingResponse.ok || !brandingPayload?.success) {
        throw new Error(brandingPayload?.message || "Gagal menyimpan branding.");
      }

      if (brandingPayload?.success && brandingPayload.data) {
        setBrandingForm(brandingPayload.data);
      }

      if (brandingLogoFile) {
        const formData = new FormData();
        formData.append("logo", brandingLogoFile);

        const response = await fetch(`${apiBaseUrl}/api/admin/branding/logo`, {
          ...withCredentials(),
          method: "POST",
          body: formData
        });

        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Gagal upload logo.");
        }

        setBrandingForm(payload.data);
        setBrandingLogoFile(null);
      }

      window.dispatchEvent(new Event(BRANDING_UPDATED_EVENT));
      await fetchDashboard();
      setMessage("Branding berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan branding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: "#64748b", fontWeight: 600, padding: "20px" }}>Loading dashboard...</div>;
  }

  if (!data) {
    return <div style={{ color: "#64748b", padding: "20px" }}>Gagal memuat data.</div>;
  }

  const stats = [
    {
      label: "Total Penghasilan",
      value: formatRupiah(data.totalEarnings),
      color: "#059669",
      bgColor: "#ecfdf5",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 17.93V20h-2v-.07A7.96 7.96 0 0 1 4.07 13H4v-2h.07A7.96 7.96 0 0 1 11 4.07V4h2v.07A7.96 7.96 0 0 1 19.93 11H20v2h-.07A7.96 7.96 0 0 1 13 19.93Z" fill="currentColor" />
        </svg>
      )
    },
    {
      label: "Daftar Pengguna",
      value: data.users.toLocaleString("id-ID"),
      color: "#2563eb",
      bgColor: "#eff6ff",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 19a5 5 0 0 1 10 0H4Zm11 0a4 4 0 0 1 5-3.87V19h-5Z" fill="currentColor" />
        </svg>
      )
    },
    {
      label: "Dokumen Sukses",
      value: data.completed.toLocaleString("id-ID"),
      color: "#0891b2",
      bgColor: "#ecfeff",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor" />
        </svg>
      )
    },
    {
      label: "Dokumen Gagal",
      value: data.failed.toLocaleString("id-ID"),
      color: "#dc2626",
      bgColor: "#fef2f2",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" fill="currentColor" />
        </svg>
      )
    },
    {
      label: "Total Pengecekan",
      value: data.requests.toLocaleString("id-ID"),
      color: "#7c3aed",
      bgColor: "#f5f3ff",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 14H7v-2h5v2Zm5-4H7v-2h10v2Zm0-4H7V7h10v2Z" fill="currentColor" />
        </svg>
      )
    }
  ];

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section
        style={{
          ...styles.card,
          padding: isMobile ? "20px 16px" : "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: "16px",
          flexDirection: isMobile ? "column" : "row"
        }}
      >
        <div>
          <h1 style={{ fontSize: isMobile ? "24px" : "26px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
            Dashboard Admin
          </h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>
            Kelola performa platform, paket harga, voucher, dan identitas brand dari satu panel.
          </p>
        </div>
        <div
          style={{
            minWidth: isMobile ? "100%" : "200px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0"
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Waktu Server
          </div>
          <div style={{ color: "#0f172a", fontSize: "22px", fontWeight: 700, marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>{serverTime}</div>
        </div>
      </section>

      {message ? (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: message.includes("berhasil") ? "#dcfce7" : "#fef2f2",
            border: message.includes("berhasil") ? "1px solid #bbf7d0" : "1px solid #fecaca",
            color: message.includes("berhasil") ? "#166534" : "#991b1b",
            fontWeight: 600,
            fontSize: "14px"
          }}
        >
          {message}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        {stats.map((stat) => (
          <article key={stat.label} style={{ ...styles.card, padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}
                >
                  {stat.label}
                </div>
                <div style={{ color: "#0f172a", fontSize: "22px", fontWeight: 800, marginTop: "10px" }}>{stat.value}</div>
              </div>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: stat.bgColor,
                  color: stat.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {stat.icon}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section style={{ ...styles.card, padding: isMobile ? "16px" : "20px" }}>
        <SectionHeader
          title="Pesanan Terbaru"
          subtitle="Snapshot cepat order terbaru yang masuk ke sistem."
          action={
            <Link
              href="/admin/orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "38px",
                padding: "0 16px",
                borderRadius: "10px",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none"
              }}
            >
              Lihat Semua
            </Link>
          }
        />

        {isMobile ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {data.recentRequests.map((req) => {
              const tone = getPaymentTone(req.paymentStatus);

              return (
                <article
                  key={req.id}
                  style={{
                    borderRadius: "12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "12px" }}>#{req.id.slice(-4).toUpperCase()}</div>
                      <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "15px", marginTop: "2px", lineHeight: 1.3 }}>{req.user.fullName}</div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: "26px",
                        padding: "0 8px",
                        borderRadius: "999px",
                        background: tone.background,
                        color: tone.color,
                        fontWeight: 600,
                        fontSize: "11px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {req.paymentStatus}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: "8px" }}>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Produk</div>
                      <div style={{ color: "#334155", fontWeight: 500, fontSize: "13px" }}>{req.package.name}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Waktu</div>
                        <div style={{ color: "#334155", fontWeight: 500, fontSize: "12px", lineHeight: 1.4 }}>{formatWibDateTime(req.createdAt)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Total</div>
                        <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "13px" }}>{formatRupiah(req.finalAmount || 0)}</div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {["ID", "Pelanggan", "Produk", "Waktu Pengecekan", "Total", "Status"].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: "left",
                        color: "#94a3b8",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "0 16px 12px 16px",
                        fontWeight: 600
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentRequests.map((req) => {
                  const tone = getPaymentTone(req.paymentStatus);
                  return (
                    <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontWeight: 500, fontSize: "13px" }}>#{req.id.slice(-4).toUpperCase()}</td>
                      <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: 600, fontSize: "14px" }}>{req.user.fullName}</td>
                      <td style={{ padding: "14px 16px", color: "#475569", fontSize: "14px" }}>{req.package.name}</td>
                      <td style={{ padding: "14px 16px", color: "#475569", fontWeight: 500, fontSize: "13px" }}>{formatWibDateTime(req.createdAt)}</td>
                      <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: 700, fontSize: "14px" }}>{formatRupiah(req.finalAmount || 0)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: "28px",
                            padding: "0 10px",
                            borderRadius: "999px",
                            background: tone.background,
                            color: tone.color,
                            fontWeight: 600,
                            fontSize: "12px"
                          }}
                        >
                          {req.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <article style={{ ...styles.card, padding: isMobile ? "16px" : "20px" }}>
          <SectionHeader title="Branding & Sosial" subtitle="Kelola identitas brand yang dipakai seluruh frontend." />

          <form
            id="branding-form"
            onSubmit={handleBrandingSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: "14px"
            }}
          >
            <label style={{ display: "grid", gap: "6px", color: "#334155", fontWeight: 600, fontSize: "13px" }}>
              Nama Brand
              <input
                value={brandingForm.brandName}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, brandName: e.target.value }))}
                style={styles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "6px", color: "#334155", fontWeight: 600, fontSize: "13px" }}>
              Link Instagram
              <input
                value={brandingForm.instagramUrl || ""}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                placeholder="https://instagram.com/..."
                style={styles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "6px", color: "#334155", fontWeight: 600, fontSize: "13px" }}>
              Link TikTok
              <input
                value={brandingForm.tiktokUrl || ""}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))}
                placeholder="https://www.tiktok.com/..."
                style={styles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "6px", color: "#334155", fontWeight: 600, fontSize: "13px" }}>
              Link WhatsApp
              <input
                value={brandingForm.whatsappUrl || ""}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, whatsappUrl: e.target.value }))}
                placeholder="https://wa.me/628..."
                style={styles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "6px", color: "#334155", fontWeight: 600, fontSize: "13px" }}>
              Upload Logo Lokal
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setBrandingLogoFile(e.target.files?.[0] || null)}
                style={{
                  ...styles.input,
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px"
                }}
              />
            </label>
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                minHeight: "100px",
                padding: "14px",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}
            >
              {brandingLogoPreviewUrl || brandingForm.logoUrl ? (
                <img
                  src={brandingLogoPreviewUrl || brandingForm.logoUrl}
                  alt={brandingForm.brandName}
                  style={{ width: "48px", height: "48px", objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "11px"
                  }}
                >
                  LOGO
                </div>
              )}
              <div>
                <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "16px" }}>{brandingForm.brandName || "Verscan"}</div>
                <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px", lineHeight: 1.5 }}>
                  {brandingLogoFile
                    ? brandingLogoFile.name
                    : brandingForm.logoUrl
                      ? "Logo aktif akan tampil di navbar, footer, modal login, dan panel admin."
                      : "Belum ada logo upload. Maksimum 5 MB."}
                </div>
              </div>
            </div>
          </form>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ color: "#94a3b8", fontSize: "12px" }}>
              Format didukung: PNG, JPG, JPEG, WEBP, dan SVG.
            </div>
            <button
              type="submit"
              form="branding-form"
              disabled={saving}
              style={{
                ...styles.button,
                background: "#2563eb",
                color: "#ffffff",
                opacity: saving ? 0.7 : 1
              }}
            >
              Simpan Branding
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
