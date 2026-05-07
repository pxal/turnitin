"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
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

const tokens = {
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -16px rgba(15, 23, 42, 0.08)"
  } as const,
  softCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px"
  } as const,
  title: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a"
  } as const,
  muted: {
    color: "#64748b"
  } as const,
  input: {
    width: "100%",
    height: "44px",
    borderRadius: "12px",
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
        <h3 style={{ ...tokens.title, fontSize: "17px" }}>{title}</h3>
        {subtitle ? (
          <p style={{ ...tokens.muted, fontSize: "13px", marginTop: "4px" }}>{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function getPaymentTone(status: string) {
  if (status === "PAID") {
    return { background: "#dcfce7", color: "#166534", dot: "#22c55e" };
  }

  if (status === "PROCESSING") {
    return { background: "#fef3c7", color: "#92400e", dot: "#f59e0b" };
  }

  return { background: "#f1f5f9", color: "#475569", dot: "#94a3b8" };
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

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE: Array<{ bg: string; color: string }> = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#ede9fe", color: "#6d28d9" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#fee2e2", color: "#b91c1c" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#cffafe", color: "#0e7490" }
];

function pickAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

type StatCard = {
  label: string;
  value: string;
  caption: string;
  iconBg: string;
  iconColor: string;
  ribbon: string;
  icon: ReactNode;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const isCompact = useIsMobile(1200);
  const [serverTime, setServerTime] = useState("");
  const [serverDate, setServerDate] = useState("");
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
    function syncClock() {
      const now = new Date();
      setServerTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
      setServerDate(
        new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        }).format(now)
      );
    }

    syncClock();
    const timer = window.setInterval(syncClock, 1000);

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

  const stats: StatCard[] = useMemo(() => {
    if (!data) return [];

    const successRate = data.requests > 0 ? Math.round((data.completed / data.requests) * 100) : 0;
    const failRate = data.requests > 0 ? Math.round((data.failed / data.requests) * 100) : 0;

    return [
      {
        label: "Total Penghasilan",
        value: formatRupiah(data.totalEarnings),
        caption: "Akumulasi pembayaran sukses",
        iconBg: "linear-gradient(135deg, #10b981, #047857)",
        iconColor: "#ffffff",
        ribbon: "linear-gradient(90deg, #10b981, #34d399)",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm.75 4.5a.75.75 0 0 0-1.5 0v.78a3 3 0 0 0-.16 5.84l1.66.5a1.5 1.5 0 0 1-.43 2.94 1.5 1.5 0 0 1-1.49-1.31.75.75 0 1 0-1.49.18 3 3 0 0 0 2.41 2.6V19a.75.75 0 0 0 1.5 0v-.94a3 3 0 0 0 .42-5.83l-1.65-.49a1.5 1.5 0 0 1 .43-2.94 1.5 1.5 0 0 1 1.48 1.27.75.75 0 1 0 1.49-.2 3 3 0 0 0-2.42-2.55V7.5Z"
              fill="currentColor"
            />
          </svg>
        )
      },
      {
        label: "Daftar Pengguna",
        value: data.users.toLocaleString("id-ID"),
        caption: "Akun terdaftar di platform",
        iconBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        iconColor: "#ffffff",
        ribbon: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a5.5 5.5 0 0 1 11 0H3.5Zm12 0a4.5 4.5 0 0 1 5-4.47V19h-5Z"
              fill="currentColor"
            />
          </svg>
        )
      },
      {
        label: "Dokumen Sukses",
        value: data.completed.toLocaleString("id-ID"),
        caption: `Tingkat keberhasilan ${successRate}%`,
        iconBg: "linear-gradient(135deg, #06b6d4, #0e7490)",
        iconColor: "#ffffff",
        ribbon: "linear-gradient(90deg, #06b6d4, #22d3ee)",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor" />
          </svg>
        )
      },
      {
        label: "Dokumen Gagal",
        value: data.failed.toLocaleString("id-ID"),
        caption: `Rasio kegagalan ${failRate}%`,
        iconBg: "linear-gradient(135deg, #f87171, #b91c1c)",
        iconColor: "#ffffff",
        ribbon: "linear-gradient(90deg, #f87171, #fda4af)",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z"
              fill="currentColor"
            />
          </svg>
        )
      },
      {
        label: "Total Pengecekan",
        value: data.requests.toLocaleString("id-ID"),
        caption: "Order masuk sepanjang waktu",
        iconBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        iconColor: "#ffffff",
        ribbon: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 14H7v-2h5v2Zm5-4H7v-2h10v2Zm0-4H7V7h10v2Z"
              fill="currentColor"
            />
          </svg>
        )
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
          fontWeight: 600
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ color: "#64748b", padding: "20px" }}>Gagal memuat data.</div>
    );
  }

  const successRate = data.requests > 0 ? Math.round((data.completed / data.requests) * 100) : 0;
  const failRate = data.requests > 0 ? Math.round((data.failed / data.requests) * 100) : 0;
  const pendingCount = Math.max(data.requests - data.completed - data.failed, 0);
  const pendingRate = data.requests > 0 ? Math.round((pendingCount / data.requests) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "24px",
          padding: isMobile ? "24px 20px" : "32px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #2563eb 100%)",
          color: "#ffffff",
          boxShadow: "0 30px 60px -30px rgba(15, 23, 42, 0.45)"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 12% 20%, rgba(56, 189, 248, 0.35), transparent 45%), radial-gradient(circle at 90% 0%, rgba(167, 139, 250, 0.4), transparent 45%), radial-gradient(circle at 100% 100%, rgba(34, 211, 238, 0.25), transparent 50%)",
            pointerEvents: "none"
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-60px",
            right: "-40px",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            pointerEvents: "none"
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-100px",
            right: "-90px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            pointerEvents: "none"
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: "20px",
            flexDirection: isMobile ? "column" : "row"
          }}
        >
          <div style={{ maxWidth: "640px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.22)",
                color: "rgba(255, 255, 255, 0.92)",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#34d399",
                  boxShadow: "0 0 0 4px rgba(52, 211, 153, 0.25)"
                }}
              />
              Live Overview
            </span>
            <h1
              style={{
                fontSize: isMobile ? "26px" : "32px",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
                marginTop: "16px",
                letterSpacing: "-0.01em"
              }}
            >
              Selamat datang kembali, Admin.
            </h1>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.78)",
                marginTop: "10px",
                fontSize: "14px",
                lineHeight: 1.6,
                maxWidth: "560px"
              }}
            >
              Pantau performa platform, kelola paket harga, voucher, gateway pembayaran, dan
              identitas brand dari satu panel terpusat.
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "22px",
                flexWrap: "wrap"
              }}
            >
              <Link
                href="/admin/orders"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  background: "#ffffff",
                  color: "#1e3a8a",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none",
                  boxShadow: "0 8px 20px -10px rgba(15, 23, 42, 0.4)"
                }}
              >
                Lihat Pesanan
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/admin/packages"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none",
                  border: "1px solid rgba(255, 255, 255, 0.25)"
                }}
              >
                Kelola Paket
              </Link>
            </div>
          </div>

          <div
            style={{
              minWidth: isMobile ? "100%" : "240px",
              padding: "18px 20px",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.22)",
              backdropFilter: "blur(14px)"
            }}
          >
            <div
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em"
              }}
            >
              Waktu Server (WIB)
            </div>
            <div
              style={{
                color: "#ffffff",
                fontSize: "30px",
                fontWeight: 700,
                marginTop: "6px",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em"
              }}
            >
              {serverTime}
            </div>
            <div
              style={{
                color: "rgba(255, 255, 255, 0.78)",
                fontSize: "12px",
                marginTop: "4px",
                fontWeight: 500
              }}
            >
              {serverDate}
            </div>
          </div>
        </div>
      </section>

      {message ? (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "14px",
            background: message.includes("berhasil") ? "#ecfdf5" : "#fef2f2",
            border: message.includes("berhasil") ? "1px solid #bbf7d0" : "1px solid #fecaca",
            color: message.includes("berhasil") ? "#166534" : "#991b1b",
            fontWeight: 600,
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: message.includes("berhasil") ? "#22c55e" : "#ef4444"
            }}
          />
          {message}
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(5, minmax(0, 1fr))",
          gap: "16px"
        }}
      >
        {stats.map((stat) => (
          <article
            key={stat.label}
            style={{
              ...tokens.card,
              padding: "20px",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: stat.ribbon
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px"
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  lineHeight: 1.3
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: stat.iconBg,
                  color: stat.iconColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 8px 18px -8px rgba(15, 23, 42, 0.35)"
                }}
              >
                {stat.icon}
              </div>
            </div>
            <div>
              <div
                style={{
                  color: "#0f172a",
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 500,
                  marginTop: "6px"
                }}
              >
                {stat.caption}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 2fr) minmax(0, 1fr)",
          gap: "20px",
          alignItems: "stretch"
        }}
      >
        <article style={{ ...tokens.card, padding: isMobile ? "20px" : "24px" }}>
          <SectionHeader
            title="Pesanan Terbaru"
            subtitle="Snapshot order yang baru masuk ke sistem."
            action={
              <Link
                href="/admin/orders"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  minHeight: "36px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none"
                }}
              >
                Lihat Semua
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            }
          />

          {data.recentRequests.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "#64748b",
                background: "#f8fafc",
                borderRadius: "14px",
                border: "1px dashed #cbd5e1",
                fontSize: "14px"
              }}
            >
              Belum ada pesanan yang masuk.
            </div>
          ) : isMobile ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {data.recentRequests.map((req) => {
                const tone = getPaymentTone(req.paymentStatus);
                const avatarTone = pickAvatarColor(req.user.fullName || req.id);

                return (
                  <article
                    key={req.id}
                    style={{
                      borderRadius: "14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "14px"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "flex-start",
                        marginBottom: "12px"
                      }}
                    >
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", minWidth: 0 }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: avatarTone.bg,
                            color: avatarTone.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "13px",
                            flexShrink: 0
                          }}
                        >
                          {getInitials(req.user.fullName || "?")}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "11px" }}>
                            #{req.id.slice(-4).toUpperCase()}
                          </div>
                          <div
                            style={{
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: "14px",
                              lineHeight: 1.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {req.user.fullName}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          minHeight: "26px",
                          padding: "0 10px",
                          borderRadius: "999px",
                          background: tone.background,
                          color: tone.color,
                          fontWeight: 600,
                          fontSize: "11px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: tone.dot
                          }}
                        />
                        {req.paymentStatus}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: "8px" }}>
                      <div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                          Produk
                        </div>
                        <div style={{ color: "#334155", fontWeight: 500, fontSize: "13px" }}>{req.package.name}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div>
                          <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                            Waktu
                          </div>
                          <div style={{ color: "#334155", fontWeight: 500, fontSize: "12px", lineHeight: 1.4 }}>
                            {formatWibDateTime(req.createdAt)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                            Total
                          </div>
                          <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "13px" }}>
                            {formatRupiah(req.finalAmount || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: "640px" }}>
                <thead>
                  <tr>
                    {["ID", "Pelanggan", "Produk", "Waktu", "Total", "Status"].map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: "left",
                          color: "#64748b",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          padding: "0 14px 12px 14px",
                          fontWeight: 700,
                          background: "transparent"
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentRequests.map((req, index) => {
                    const tone = getPaymentTone(req.paymentStatus);
                    const avatarTone = pickAvatarColor(req.user.fullName || req.id);
                    const isLast = index === data.recentRequests.length - 1;

                    return (
                      <tr key={req.id}>
                        <td
                          style={{
                            padding: "14px",
                            color: "#94a3b8",
                            fontWeight: 600,
                            fontSize: "12px",
                            borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap"
                          }}
                        >
                          #{req.id.slice(-4).toUpperCase()}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                            verticalAlign: "middle"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                background: avatarTone.bg,
                                color: avatarTone.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "12px",
                                flexShrink: 0
                              }}
                            >
                              {getInitials(req.user.fullName || "?")}
                            </div>
                            <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "14px" }}>
                              {req.user.fullName}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            color: "#475569",
                            fontSize: "13px",
                            borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                            verticalAlign: "middle"
                          }}
                        >
                          {req.package.name}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            color: "#475569",
                            fontWeight: 500,
                            fontSize: "12px",
                            borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {formatWibDateTime(req.createdAt)}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            color: "#0f172a",
                            fontWeight: 700,
                            fontSize: "14px",
                            borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {formatRupiah(req.finalAmount || 0)}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            borderBottom: isLast ? "none" : "1px solid #f1f5f9",
                            verticalAlign: "middle"
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              minHeight: "26px",
                              padding: "0 10px",
                              borderRadius: "999px",
                              background: tone.background,
                              color: tone.color,
                              fontWeight: 600,
                              fontSize: "11px"
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: tone.dot
                              }}
                            />
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
        </article>

        <article
          style={{
            ...tokens.card,
            padding: isMobile ? "20px" : "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}
        >
          <SectionHeader
            title="Performa Platform"
            subtitle="Distribusi status order saat ini."
          />

          <PerformanceMeter
            label="Sukses"
            value={data.completed}
            total={data.requests}
            percent={successRate}
            tone={{ bar: "linear-gradient(90deg, #10b981, #34d399)", text: "#047857" }}
          />
          <PerformanceMeter
            label="Pending"
            value={pendingCount}
            total={data.requests}
            percent={pendingRate}
            tone={{ bar: "linear-gradient(90deg, #f59e0b, #fbbf24)", text: "#b45309" }}
          />
          <PerformanceMeter
            label="Gagal"
            value={data.failed}
            total={data.requests}
            percent={failRate}
            tone={{ bar: "linear-gradient(90deg, #f87171, #ef4444)", text: "#b91c1c" }}
          />

          <div
            style={{
              marginTop: "auto",
              paddingTop: "8px",
              borderTop: "1px solid #f1f5f9",
              display: "grid",
              gap: "10px"
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}
            >
              Aksi Cepat
            </div>
            <div style={{ display: "grid", gap: "8px" }}>
              <QuickAction
                href="/admin/packages"
                label="Kelola Paket"
                description="Atur harga & paket layanan"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 2.2 5.6 2.8L12 10.8 6.4 8 12 5.2Zm-6 4.4 5 2.5v6.5l-5-2.5V9.6Zm7 8.9v-6.5l5-2.5v6.5l-5 2.5Z"
                      fill="currentColor"
                    />
                  </svg>
                }
              />
              <QuickAction
                href="/admin/gateway"
                label="Gateway"
                description="Konfigurasi pembayaran"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2 1.5v2h12V8H6Zm0 5v4h5v-4H6Z"
                      fill="currentColor"
                    />
                  </svg>
                }
              />
              <QuickAction
                href="/admin/affiliates"
                label="Affiliate"
                description="Pantau partner & komisi"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 19a5 5 0 0 1 10 0H4Zm11 0a4 4 0 0 1 5-3.87V19h-5Z"
                      fill="currentColor"
                    />
                  </svg>
                }
              />
            </div>
          </div>
        </article>
      </section>

      <section style={{ ...tokens.card, padding: isMobile ? "20px" : "24px" }}>
        <SectionHeader
          title="Branding & Sosial"
          subtitle="Kelola identitas brand yang dipakai seluruh frontend."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start"
          }}
        >
          <form
            id="branding-form"
            onSubmit={handleBrandingSubmit}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: "14px"
            }}
          >
            <Field label="Nama Brand">
              <input
                value={brandingForm.brandName}
                onChange={(e) =>
                  setBrandingForm((prev) => ({ ...prev, brandName: e.target.value }))
                }
                style={tokens.input}
              />
            </Field>
            <Field label="Link Instagram">
              <input
                value={brandingForm.instagramUrl || ""}
                onChange={(e) =>
                  setBrandingForm((prev) => ({ ...prev, instagramUrl: e.target.value }))
                }
                placeholder="https://instagram.com/..."
                style={tokens.input}
              />
            </Field>
            <Field label="Link TikTok">
              <input
                value={brandingForm.tiktokUrl || ""}
                onChange={(e) =>
                  setBrandingForm((prev) => ({ ...prev, tiktokUrl: e.target.value }))
                }
                placeholder="https://www.tiktok.com/..."
                style={tokens.input}
              />
            </Field>
            <Field label="Link WhatsApp">
              <input
                value={brandingForm.whatsappUrl || ""}
                onChange={(e) =>
                  setBrandingForm((prev) => ({ ...prev, whatsappUrl: e.target.value }))
                }
                placeholder="https://wa.me/628..."
                style={tokens.input}
              />
            </Field>
            <Field label="Upload Logo Lokal" full={!isMobile}>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setBrandingLogoFile(e.target.files?.[0] || null)}
                style={{
                  ...tokens.input,
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 14px"
                }}
              />
            </Field>
          </form>

          <aside
            style={{
              ...tokens.softCard,
              padding: "20px",
              background:
                "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              minHeight: "100%"
            }}
          >
            <div
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}
            >
              Pratinjau Identitas
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {brandingLogoPreviewUrl || brandingForm.logoUrl ? (
                <img
                  src={brandingLogoPreviewUrl || brandingForm.logoUrl}
                  alt={brandingForm.brandName}
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "16px",
                    objectFit: "contain",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    padding: "8px",
                    flexShrink: 0
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "14px",
                    flexShrink: 0,
                    boxShadow: "0 12px 24px -16px rgba(37, 99, 235, 0.6)"
                  }}
                >
                  {(brandingForm.brandName || "VS").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#0f172a",
                    fontWeight: 800,
                    fontSize: "18px",
                    letterSpacing: "-0.01em"
                  }}
                >
                  {brandingForm.brandName || "Verscan"}
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginTop: "4px",
                    lineHeight: 1.5
                  }}
                >
                  {brandingLogoFile
                    ? brandingLogoFile.name
                    : brandingForm.logoUrl
                      ? "Logo tampil di navbar, footer, modal login, dan panel admin."
                      : "Belum ada logo. Maks 5 MB. PNG/JPG/WEBP/SVG."}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px"
              }}
            >
              <SocialChip label="Instagram" url={brandingForm.instagramUrl} color="#db2777" />
              <SocialChip label="TikTok" url={brandingForm.tiktokUrl} color="#0f172a" />
              <SocialChip label="WhatsApp" url={brandingForm.whatsappUrl} color="#16a34a" />
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: "12px",
                borderTop: "1px dashed #cbd5e1",
                color: "#64748b",
                fontSize: "12px",
                lineHeight: 1.5
              }}
            >
              Format didukung: PNG, JPG, JPEG, WEBP, dan SVG.
            </div>
          </aside>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center"
          }}
        >
          <button
            type="submit"
            form="branding-form"
            disabled={saving}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "12px 22px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "14px",
              background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
              color: "#ffffff",
              opacity: saving ? 0.7 : 1,
              boxShadow: "0 14px 28px -16px rgba(29, 78, 216, 0.7)"
            }}
          >
            {saving ? "Menyimpan..." : "Simpan Branding"}
          </button>
        </div>
      </section>
    </div>
  );
}

function PerformanceMeter({
  label,
  value,
  total,
  percent,
  tone
}: {
  label: string;
  value: number;
  total: number;
  percent: number;
  tone: { bar: string; text: string };
}) {
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
        <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "13px" }}>{label}</span>
        <span style={{ color: tone.text, fontWeight: 700, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>
          {value.toLocaleString("id-ID")}
          <span style={{ color: "#94a3b8", fontWeight: 500, fontSize: "12px" }}>
            {" "}
            / {total.toLocaleString("id-ID")}
          </span>
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#f1f5f9",
          borderRadius: "999px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            width: `${Math.min(percent, 100)}%`,
            height: "100%",
            background: tone.bar,
            borderRadius: "999px",
            transition: "width 0.3s ease"
          }}
        />
      </div>
      <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500 }}>
        {percent}% dari total pengecekan
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
  icon
}: {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        textDecoration: "none",
        color: "inherit",
        transition: "background 0.15s, border-color 0.15s"
      }}
    >
      <span
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "10px",
          background: "#ffffff",
          color: "#1d4ed8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "1px solid #dbeafe"
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: "#0f172a", fontWeight: 600, fontSize: "13px" }}>{label}</span>
        <span style={{ display: "block", color: "#64748b", fontSize: "11px", marginTop: "2px" }}>{description}</span>
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "#94a3b8", flexShrink: 0 }}>
        <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "8px",
        color: "#334155",
        fontWeight: 600,
        fontSize: "12px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        gridColumn: full ? "1 / -1" : undefined
      }}
    >
      {label}
      <span style={{ display: "block", textTransform: "none", letterSpacing: 0 }}>{children}</span>
    </label>
  );
}

function SocialChip({
  label,
  url,
  color
}: {
  label: string;
  url?: string;
  color: string;
}) {
  const filled = Boolean(url && url.trim().length > 0);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: "999px",
        background: filled ? color : "#ffffff",
        color: filled ? "#ffffff" : "#94a3b8",
        border: filled ? "1px solid transparent" : "1px dashed #cbd5e1",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.02em"
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: filled ? "#ffffff" : "#cbd5e1"
        }}
      />
      {label}
      {filled ? null : <span style={{ marginLeft: "2px" }}>kosong</span>}
    </span>
  );
}
