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

const shellStyles = {
  card: {
    background: "#182235",
    border: "1px solid rgba(143, 163, 194, 0.14)",
    borderRadius: "20px",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)"
  } as const,
  title: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#f8fbff"
  } as const,
  muted: {
    color: "#8196b4"
  } as const,
  button: {
    border: "none",
    borderRadius: "12px",
    padding: "11px 16px",
    fontWeight: 700,
    cursor: "pointer"
  } as const,
  input: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid rgba(143, 163, 194, 0.18)",
    background: "#111a2d",
    color: "#eff6ff",
    padding: "0 14px",
    fontFamily: "inherit"
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
        <h3 style={{ ...shellStyles.title, fontSize: "22px" }}>{title}</h3>
        {subtitle ? <p style={{ ...shellStyles.muted, fontSize: "14px", marginTop: "4px" }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function getPaymentTone(status: string) {
  if (status === "PAID") {
    return { background: "rgba(97, 233, 191, 0.12)", color: "#69ebc0" };
  }

  if (status === "PROCESSING") {
    return { background: "rgba(255, 200, 87, 0.12)", color: "#ffc857" };
  }

  return { background: "rgba(126, 147, 177, 0.12)", color: "#a9bdd8" };
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
    return <div style={{ color: "#cfe0f4", fontWeight: 700 }}>Loading dashboard...</div>;
  }

  if (!data) {
    return <div style={{ color: "#cfe0f4" }}>Gagal memuat data.</div>;
  }

  const stats = [
    {
      label: "Total Penghasilan",
      value: formatRupiah(data.totalEarnings),
      color: "#69ebc0",
      icon: "$"
    },
    {
      label: "Daftar Pengguna",
      value: data.users.toLocaleString("id-ID"),
      color: "#69a8ff",
      icon: "👥"
    },
    {
      label: "Dokumen Sukses",
      value: data.completed.toLocaleString("id-ID"),
      color: "#ffd66b",
      icon: "✓"
    },
    {
      label: "Dokumen Gagal",
      value: data.failed.toLocaleString("id-ID"),
      color: "#9b8cff",
      icon: "!"
    },
    {
      label: "Total Pengecekan",
      value: data.requests.toLocaleString("id-ID"),
      color: "#ff8c69",
      icon: "≣"
    }
  ];

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section
        style={{
          ...shellStyles.card,
          padding: isMobile ? "22px 18px" : "24px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: "18px",
          flexDirection: isMobile ? "column" : "row",
          background:
            "radial-gradient(circle at right top, rgba(105, 235, 192, 0.12), transparent 26%), #182235"
        }}
      >
        <div>
          <h1 style={{ fontSize: isMobile ? "28px" : "32px", fontWeight: 900, color: "#f8fbff", lineHeight: 1.1 }}>
            Dashboard Admin
          </h1>
          <p style={{ color: "#8ea3c2", marginTop: "8px", fontSize: "15px" }}>
            Kelola performa platform, paket harga, voucher, dan identitas brand dari satu panel.
          </p>
        </div>
        <div
          style={{
            minWidth: isMobile ? "100%" : "220px",
            padding: "14px 16px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(143, 163, 194, 0.12)"
          }}
        >
          <div style={{ color: "#7f93b1", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Waktu Server
          </div>
          <div style={{ color: "#f7fbff", fontSize: "24px", fontWeight: 800, marginTop: "6px" }}>{serverTime}</div>
        </div>
      </section>

      {message ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "16px",
            background: "rgba(105, 235, 192, 0.09)",
            border: "1px solid rgba(105, 235, 192, 0.16)",
            color: "#9deed3",
            fontWeight: 700
          }}
        >
          {message}
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {stats.map((stat) => (
          <article key={stat.label} style={{ ...shellStyles.card, padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    color: "#6f86a8",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    fontSize: "13px",
                    fontWeight: 700
                  }}
                >
                  {stat.label}
                </div>
                <div style={{ color: "#f8fbff", fontSize: "22px", fontWeight: 900, marginTop: "16px" }}>{stat.value}</div>
              </div>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: `${stat.color}18`,
                  color: stat.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: 800
                }}
              >
                {stat.icon}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section style={{ ...shellStyles.card, padding: isMobile ? "18px 14px" : "22px" }}>
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
                minHeight: "42px",
                padding: "0 16px",
                borderRadius: "12px",
                background: "#69ebc0",
                color: "#0d2230",
                fontWeight: 800
              }}
            >
              Lihat Semua
            </Link>
          }
        />

        {isMobile ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {data.recentRequests.map((req) => {
              const tone = getPaymentTone(req.paymentStatus);

              return (
                <article
                  key={req.id}
                  style={{
                    borderRadius: "16px",
                    background: "#111a2d",
                    border: "1px solid rgba(143, 163, 194, 0.12)",
                    padding: "14px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <div style={{ color: "#8fa6c7", fontWeight: 700, fontSize: "13px" }}>#{req.id.slice(-4).toUpperCase()}</div>
                      <div style={{ color: "#f8fbff", fontWeight: 800, fontSize: "16px", marginTop: "4px", lineHeight: 1.3 }}>{req.user.fullName}</div>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: "28px",
                        padding: "0 10px",
                        borderRadius: "999px",
                        background: tone.background,
                        color: tone.color,
                        fontWeight: 800,
                        fontSize: "11px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {req.paymentStatus}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <div>
                      <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Produk</div>
                      <div style={{ color: "#c8d7ea", fontWeight: 600 }}>{req.package.name}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Waktu</div>
                        <div style={{ color: "#c8d7ea", fontWeight: 600, fontSize: "13px", lineHeight: 1.4 }}>{formatWibDateTime(req.createdAt)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#6f86a8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Total</div>
                        <div style={{ color: "#f8fbff", fontWeight: 800 }}>{formatRupiah(req.finalAmount || 0)}</div>
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
                <tr style={{ borderBottom: "1px solid rgba(143, 163, 194, 0.14)" }}>
                  {["ID", "Pelanggan", "Produk", "Waktu Pengecekan", "Total", "Status"].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: "left",
                        color: "#6f86a8",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "0 16px 14px 16px"
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
                    <tr key={req.id} style={{ borderBottom: "1px solid rgba(143, 163, 194, 0.08)" }}>
                      <td style={{ padding: "16px", color: "#8fa6c7", fontWeight: 600 }}>#{req.id.slice(-4).toUpperCase()}</td>
                      <td style={{ padding: "16px", color: "#f8fbff", fontWeight: 700 }}>{req.user.fullName}</td>
                      <td style={{ padding: "16px", color: "#a9bdd8" }}>{req.package.name}</td>
                      <td style={{ padding: "16px", color: "#c8d7ea", fontWeight: 600 }}>{formatWibDateTime(req.createdAt)}</td>
                      <td style={{ padding: "16px", color: "#f8fbff", fontWeight: 800 }}>{formatRupiah(req.finalAmount || 0)}</td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            minHeight: "30px",
                            padding: "0 12px",
                            borderRadius: "999px",
                            background: tone.background,
                            color: tone.color,
                            fontWeight: 800,
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
        <article style={{ ...shellStyles.card, padding: isMobile ? "18px 14px" : "22px" }}>
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
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Nama Brand
              <input
                value={brandingForm.brandName}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, brandName: e.target.value }))}
                style={shellStyles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Link Instagram
              <input
                value={brandingForm.instagramUrl || ""}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
                placeholder="https://instagram.com/..."
                style={shellStyles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Link TikTok
              <input
                value={brandingForm.tiktokUrl || ""}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))}
                placeholder="https://www.tiktok.com/..."
                style={shellStyles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Link WhatsApp
              <input
                value={brandingForm.whatsappUrl || ""}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, whatsappUrl: e.target.value }))}
                placeholder="https://wa.me/628..."
                style={shellStyles.input}
              />
            </label>
            <label style={{ display: "grid", gap: "8px", color: "#dce7f5", fontWeight: 700, fontSize: "13px" }}>
              Upload Logo Lokal
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setBrandingLogoFile(e.target.files?.[0] || null)}
                style={{
                  ...shellStyles.input,
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 14px"
                }}
              />
            </label>
            <div
              style={{
                borderRadius: "16px",
                border: "1px solid rgba(143, 163, 194, 0.14)",
                background: "#111a2d",
                minHeight: "112px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "14px"
              }}
            >
              {brandingLogoPreviewUrl || brandingForm.logoUrl ? (
                <img
                  src={brandingLogoPreviewUrl || brandingForm.logoUrl}
                  alt={brandingForm.brandName}
                  style={{ width: "56px", height: "56px", objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "rgba(105, 235, 192, 0.12)",
                    color: "#69ebc0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800
                  }}
                >
                  LOGO
                </div>
              )}
              <div>
                <div style={{ color: "#f8fbff", fontWeight: 800, fontSize: "18px" }}>{brandingForm.brandName || "Verscan"}</div>
                <div style={{ color: "#7f93b1", fontSize: "13px", marginTop: "4px", lineHeight: 1.5 }}>
                  {brandingLogoFile
                    ? brandingLogoFile.name
                    : brandingForm.logoUrl
                      ? "Logo aktif akan tampil di navbar, footer, modal login, dan panel admin."
                      : "Belum ada logo upload. Maksimum 5 MB."}
                </div>
              </div>
            </div>
          </form>

          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ color: "#7f93b1", fontSize: "13px" }}>
              Format didukung: PNG, JPG, JPEG, WEBP, dan SVG.
            </div>
            <button
              type="submit"
              form="branding-form"
              disabled={saving}
              style={{
                ...shellStyles.button,
                background: "#69ebc0",
                color: "#0b1d28",
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
