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

const styles = {
  card: {
    background: "#ffffff",
    border: "1px solid #e7ecf3",
    borderRadius: "18px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -24px rgba(15, 23, 42, 0.18)"
  } as const,
  title: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.01em"
  } as const,
  muted: {
    color: "#64748b"
  } as const,
  button: {
    border: "none",
    borderRadius: "10px",
    padding: "10px 18px",
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
  action,
  eyebrow
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px",
        flexWrap: "wrap"
      }}
    >
      <div>
        {eyebrow ? (
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#94a3b8",
              marginBottom: "4px"
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h3 style={styles.title}>{title}</h3>
        {subtitle ? <p style={{ ...styles.muted, fontSize: "13px", marginTop: "4px" }}>{subtitle}</p> : null}
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

  if (status === "PENDING") {
    return { background: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" };
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

function formatWibDateLong() {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

const AVATAR_PALETTE = [
  ["#dbeafe", "#1d4ed8"],
  ["#fef3c7", "#b45309"],
  ["#dcfce7", "#15803d"],
  ["#fae8ff", "#a21caf"],
  ["#fee2e2", "#b91c1c"],
  ["#e0e7ff", "#4338ca"]
];

function pickPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const safeValues = values.length > 0 ? values : [0, 0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = max - min || 1;
  const width = 96;
  const height = 28;
  const step = safeValues.length > 1 ? width / (safeValues.length - 1) : width;

  const points = safeValues
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `M0,${height} L${points.replace(/ /g, " L")} L${width},${height} Z`;
  const linePath = `M${points.replace(/ /g, " L")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace("#", "")})`} />
      <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function deterministicSparkline(seed: number, length = 8) {
  const values: number[] = [];
  let n = (Math.abs(seed) || 1) % 9301;
  for (let i = 0; i < length; i += 1) {
    n = (n * 9301 + 49297) % 233280;
    values.push(40 + (n / 233280) * 60);
  }
  return values;
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

  const derived = useMemo(() => {
    if (!data) {
      return null;
    }

    const successRate = data.requests > 0 ? Math.round((data.completed / data.requests) * 100) : 0;
    const failureRate = data.requests > 0 ? Math.round((data.failed / data.requests) * 100) : 0;
    const inProgress = Math.max(data.requests - data.completed - data.failed, 0);
    const pendingRate = data.requests > 0 ? Math.round((inProgress / data.requests) * 100) : 0;
    const avgRevenue = data.completed > 0 ? Math.round(data.totalEarnings / data.completed) : 0;

    const paymentBreakdown = data.recentRequests.reduce(
      (acc, item) => {
        const status = item.paymentStatus.toUpperCase();
        if (status === "PAID") acc.paid += 1;
        else if (status === "PROCESSING") acc.processing += 1;
        else acc.pending += 1;
        return acc;
      },
      { paid: 0, processing: 0, pending: 0 }
    );
    const totalRecent = data.recentRequests.length || 1;

    return {
      successRate,
      failureRate,
      pendingRate,
      inProgress,
      avgRevenue,
      paymentBreakdown,
      totalRecent
    };
  }, [data]);

  if (loading) {
    return <div style={{ color: "#64748b", fontWeight: 600, padding: "20px" }}>Loading dashboard...</div>;
  }

  if (!data || !derived) {
    return <div style={{ color: "#64748b", padding: "20px" }}>Gagal memuat data.</div>;
  }

  const stats = [
    {
      label: "Total Penghasilan",
      value: formatRupiah(data.totalEarnings),
      hint: `Rata-rata Rp ${derived.avgRevenue.toLocaleString("id-ID")} per pesanan sukses`,
      accent: "#10b981",
      bg: "#ecfdf5",
      sparkSeed: data.totalEarnings || 1,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 7V5m0 14v-2m4-7h-3.5a1.5 1.5 0 0 0 0 3h-1a1.5 1.5 0 0 0 0 3H16M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Daftar Pengguna",
      value: data.users.toLocaleString("id-ID"),
      hint: "Pengguna terdaftar di platform",
      accent: "#2563eb",
      bg: "#eff6ff",
      sparkSeed: data.users + 7,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Dokumen Sukses",
      value: data.completed.toLocaleString("id-ID"),
      hint: `${derived.successRate}% dari total pengecekan`,
      accent: "#0ea5e9",
      bg: "#ecfeff",
      sparkSeed: data.completed + 13,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="m9 11 3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Dokumen Gagal",
      value: data.failed.toLocaleString("id-ID"),
      hint: `${derived.failureRate}% pengecekan gagal`,
      accent: "#ef4444",
      bg: "#fef2f2",
      sparkSeed: data.failed + 19,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Total Pengecekan",
      value: data.requests.toLocaleString("id-ID"),
      hint: `${derived.inProgress.toLocaleString("id-ID")} masih berjalan`,
      accent: "#7c3aed",
      bg: "#f5f3ff",
      sparkSeed: data.requests + 23,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  const quickLinks: Array<{
    label: string;
    description: string;
    href: string;
    color: string;
    bg: string;
    icon: ReactNode;
  }> = [
    {
      label: "Tambah Paket",
      description: "Buat paket harga & voucher baru",
      href: "/admin/packages",
      color: "#2563eb",
      bg: "#eff6ff",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      label: "Kelola Pesanan",
      description: "Approve & verifikasi pembayaran",
      href: "/admin/orders",
      color: "#0ea5e9",
      bg: "#ecfeff",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Atur Gateway",
      description: "Sambungkan kanal pembayaran",
      href: "/admin/gateway",
      color: "#7c3aed",
      bg: "#f5f3ff",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 8h18M3 12h18M3 16h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    },
    {
      label: "Program Affiliate",
      description: "Pantau mitra & komisi",
      href: "/admin/affiliates",
      color: "#f59e0b",
      bg: "#fef3c7",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  ];

  const breakdownSegments = [
    { label: "Lunas", value: derived.paymentBreakdown.paid, color: "#22c55e" },
    { label: "Diproses", value: derived.paymentBreakdown.processing, color: "#f59e0b" },
    { label: "Menunggu", value: derived.paymentBreakdown.pending, color: "#3b82f6" }
  ];

  const previewBrandName = brandingForm.brandName || "Verscan";
  const previewLogoUrl = brandingLogoPreviewUrl || brandingForm.logoUrl || "";

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* HERO */}
      <section
        style={{
          position: "relative",
          borderRadius: "22px",
          overflow: "hidden",
          color: "#f8fafc",
          background:
            "radial-gradient(circle at top right, rgba(96, 165, 250, 0.45), transparent 55%), radial-gradient(circle at 20% 80%, rgba(129, 140, 248, 0.35), transparent 50%), linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a8a 100%)",
          padding: isMobile ? "26px 20px" : "32px 36px",
          boxShadow: "0 20px 50px -32px rgba(15, 23, 42, 0.55)"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.5,
            maskImage: "linear-gradient(135deg, rgba(0,0,0,0.6), transparent 60%)"
          }}
        />

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr",
            gap: isMobile ? "20px" : "32px",
            alignItems: "center"
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#cbd5e1",
                letterSpacing: "0.06em",
                textTransform: "uppercase"
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#22c55e" }} />
              Sistem berjalan normal
            </div>
            <h1
              style={{
                marginTop: "14px",
                fontSize: isMobile ? "24px" : "30px",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.18,
                letterSpacing: "-0.02em"
              }}
            >
              Selamat datang kembali, Admin
            </h1>
            <p
              style={{
                marginTop: "10px",
                color: "#cbd5e1",
                fontSize: "14px",
                maxWidth: "560px",
                lineHeight: 1.6
              }}
            >
              Pantau performa platform, kelola pesanan masuk, dan atur identitas brand dari satu dashboard yang ringkas.
              Hari ini: <span style={{ color: "#f8fafc", fontWeight: 600 }}>{formatWibDateLong()}</span>.
            </p>

            <div
              style={{
                marginTop: "22px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))",
                gap: "12px",
                maxWidth: "560px"
              }}
            >
              {[
                {
                  label: "Pendapatan",
                  value: formatRupiah(data.totalEarnings),
                  hint: "Akumulasi"
                },
                {
                  label: "Tingkat Sukses",
                  value: `${derived.successRate}%`,
                  hint: `${data.completed.toLocaleString("id-ID")} sukses`
                },
                {
                  label: "Antrean",
                  value: derived.inProgress.toLocaleString("id-ID"),
                  hint: "Sedang diproses"
                }
              ].map((mini) => (
                <div
                  key={mini.label}
                  style={{
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    padding: "12px 14px",
                    backdropFilter: "blur(6px)"
                  }}
                >
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "#cbd5e1",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em"
                    }}
                  >
                    {mini.label}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "16px" : "18px",
                      color: "#ffffff",
                      fontWeight: 800,
                      marginTop: "6px",
                      letterSpacing: "-0.01em",
                      fontVariantNumeric: "tabular-nums"
                    }}
                  >
                    {mini.value}
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{mini.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: isMobile ? "flex-start" : "flex-end"
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                minWidth: isMobile ? "100%" : "220px",
                backdropFilter: "blur(8px)"
              }}
            >
              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}
              >
                Waktu Server WIB
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: "30px",
                  fontWeight: 800,
                  marginTop: "6px",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em"
                }}
              >
                {serverTime}
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                Sinkron dengan zona Asia/Jakarta
              </div>
            </div>

            <Link
              href="/admin/orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none",
                boxShadow: "0 12px 30px -12px rgba(37, 99, 235, 0.6)"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Lihat semua pesanan
            </Link>
          </div>
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

      {/* KPI STRIP */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px"
        }}
      >
        {stats.map((stat) => (
          <article
            key={stat.label}
            style={{
              ...styles.card,
              padding: "20px",
              position: "relative",
              overflow: "hidden"
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
                background: `linear-gradient(90deg, ${stat.accent} 0%, ${stat.accent}55 100%)`
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em"
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: "26px",
                    fontWeight: 800,
                    marginTop: "10px",
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums"
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    marginTop: "8px",
                    lineHeight: 1.4
                  }}
                >
                  {stat.hint}
                </div>
              </div>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: stat.bg,
                  color: stat.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {stat.icon}
              </div>
            </div>

            <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
              <Sparkline values={deterministicSparkline(stat.sparkSeed)} color={stat.accent} />
            </div>
          </article>
        ))}
      </section>

      {/* MAIN GRID */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2fr) minmax(0, 1fr)",
          gap: "20px"
        }}
      >
        {/* Pesanan Terbaru */}
        <article style={{ ...styles.card, padding: isMobile ? "18px" : "24px" }}>
          <SectionHeader
            eyebrow="Aktivitas"
            title="Pesanan Terbaru"
            subtitle="Snapshot order paling baru yang masuk ke sistem."
            action={
              <Link
                href="/admin/orders"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minHeight: "38px",
                  padding: "0 16px",
                  borderRadius: "10px",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none"
                }}
              >
                Lihat Semua
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            }
          />

          {data.recentRequests.length === 0 ? (
            <div
              style={{
                padding: "32px",
                borderRadius: "14px",
                border: "1px dashed #cbd5e1",
                background: "#f8fafc",
                textAlign: "center",
                color: "#64748b",
                fontWeight: 600,
                fontSize: "13px"
              }}
            >
              Belum ada pesanan masuk.
            </div>
          ) : isMobile ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {data.recentRequests.map((req) => {
                const tone = getPaymentTone(req.paymentStatus);
                const [bg, fg] = pickPalette(req.user.fullName);

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
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "12px",
                            background: bg,
                            color: fg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "13px",
                            flexShrink: 0
                          }}
                        >
                          {getInitials(req.user.fullName)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "14px", lineHeight: 1.3 }}>
                            {req.user.fullName}
                          </div>
                          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "11px" }}>
                            #{req.id.slice(-4).toUpperCase()}
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
                        <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: tone.dot }} />
                        {req.paymentStatus}
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: "8px" }}>
                      <div>
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "10.5px",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            marginBottom: "2px",
                            fontWeight: 600
                          }}
                        >
                          Produk
                        </div>
                        <div style={{ color: "#334155", fontWeight: 500, fontSize: "13px" }}>{req.package.name}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: "10.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: "2px",
                              fontWeight: 600
                            }}
                          >
                            Waktu
                          </div>
                          <div style={{ color: "#334155", fontWeight: 500, fontSize: "12px", lineHeight: 1.4 }}>
                            {formatWibDateTime(req.createdAt)}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: "10.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: "2px",
                              fontWeight: 600
                            }}
                          >
                            Total
                          </div>
                          <div
                            style={{
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: "13px",
                              fontVariantNumeric: "tabular-nums"
                            }}
                          >
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
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: "720px" }}>
                <thead>
                  <tr>
                    {["Pelanggan", "Produk", "Waktu", "Total", "Status"].map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: "left",
                          color: "#94a3b8",
                          fontSize: "10.5px",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          padding: "12px 16px",
                          fontWeight: 700,
                          background: "#f8fafc",
                          borderTop: "1px solid #e2e8f0",
                          borderBottom: "1px solid #e2e8f0"
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
                    const [bg, fg] = pickPalette(req.user.fullName);
                    const isLast = index === data.recentRequests.length - 1;
                    const cellBase = {
                      padding: "16px",
                      borderBottom: isLast ? "none" : "1px solid #f1f5f9"
                    } as const;

                    return (
                      <tr key={req.id}>
                        <td style={cellBase}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "12px",
                                background: bg,
                                color: fg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "13px",
                                flexShrink: 0
                              }}
                            >
                              {getInitials(req.user.fullName)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: "#0f172a", fontWeight: 600, fontSize: "14px", lineHeight: 1.3 }}>
                                {req.user.fullName}
                              </div>
                              <div style={{ color: "#94a3b8", fontWeight: 500, fontSize: "12px" }}>
                                #{req.id.slice(-4).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...cellBase, color: "#475569", fontSize: "13.5px" }}>{req.package.name}</td>
                        <td style={{ ...cellBase, color: "#475569", fontWeight: 500, fontSize: "12.5px" }}>
                          {formatWibDateTime(req.createdAt)}
                        </td>
                        <td
                          style={{
                            ...cellBase,
                            color: "#0f172a",
                            fontWeight: 700,
                            fontSize: "14px",
                            fontVariantNumeric: "tabular-nums"
                          }}
                        >
                          {formatRupiah(req.finalAmount || 0)}
                        </td>
                        <td style={cellBase}>
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
                              fontSize: "11.5px"
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: tone.dot }} />
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

        {/* Right column */}
        <div style={{ display: "grid", gap: "20px", alignContent: "flex-start" }}>
          {/* Status Operasional */}
          <article style={{ ...styles.card, padding: "22px" }}>
            <SectionHeader
              eyebrow="Performa"
              title="Status Operasional"
              subtitle="Distribusi hasil pengecekan dokumen."
            />

            <div style={{ display: "grid", gap: "14px" }}>
              {[
                {
                  label: "Tingkat Sukses",
                  value: derived.successRate,
                  color: "#22c55e",
                  count: data.completed,
                  total: data.requests
                },
                {
                  label: "Sedang Berjalan",
                  value: derived.pendingRate,
                  color: "#3b82f6",
                  count: derived.inProgress,
                  total: data.requests
                },
                {
                  label: "Gagal",
                  value: derived.failureRate,
                  color: "#ef4444",
                  count: data.failed,
                  total: data.requests
                }
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <span style={{ color: "#475569", fontWeight: 600, fontSize: "13px" }}>{row.label}</span>
                    <span style={{ color: "#0f172a", fontWeight: 700, fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>
                      {row.value}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "999px",
                      background: "#f1f5f9",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(row.value, 1.5)}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${row.color} 0%, ${row.color}cc 100%)`,
                        borderRadius: "999px",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "11.5px", marginTop: "4px", fontWeight: 500 }}>
                    {row.count.toLocaleString("id-ID")} dari {row.total.toLocaleString("id-ID")} pengecekan
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "14px 16px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%)",
                border: "1px solid rgba(37, 99, 235, 0.18)"
              }}
            >
              <div style={{ color: "#1e3a8a", fontWeight: 700, fontSize: "13px" }}>
                Rata-rata revenue per pesanan sukses
              </div>
              <div
                style={{
                  color: "#0f172a",
                  fontSize: "20px",
                  fontWeight: 800,
                  marginTop: "4px",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em"
                }}
              >
                {formatRupiah(derived.avgRevenue)}
              </div>
            </div>
          </article>

          {/* Aksi Cepat */}
          <article style={{ ...styles.card, padding: "22px" }}>
            <SectionHeader
              eyebrow="Pintasan"
              title="Aksi Cepat"
              subtitle="Akses langsung ke modul utama."
            />

            <div style={{ display: "grid", gap: "10px" }}>
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s"
                  }}
                >
                  <span
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      background: link.bg,
                      color: link.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    {link.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", color: "#0f172a", fontWeight: 600, fontSize: "13.5px" }}>
                      {link.label}
                    </span>
                    <span style={{ display: "block", color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                      {link.description}
                    </span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </article>

          {/* Distribusi Pembayaran */}
          <article style={{ ...styles.card, padding: "22px" }}>
            <SectionHeader
              eyebrow="Pembayaran"
              title="Distribusi Status"
              subtitle={`Berdasarkan ${derived.totalRecent} order terbaru.`}
            />

            <div
              style={{
                display: "flex",
                width: "100%",
                height: "12px",
                borderRadius: "999px",
                overflow: "hidden",
                background: "#f1f5f9"
              }}
            >
              {breakdownSegments.map((seg) =>
                seg.value > 0 ? (
                  <div
                    key={seg.label}
                    style={{
                      width: `${(seg.value / derived.totalRecent) * 100}%`,
                      background: seg.color,
                      transition: "width 0.4s ease"
                    }}
                    title={`${seg.label}: ${seg.value}`}
                  />
                ) : null
              )}
            </div>

            <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
              {breakdownSegments.map((seg) => (
                <div
                  key={seg.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "999px",
                        background: seg.color
                      }}
                    />
                    <span style={{ color: "#475569", fontSize: "13px", fontWeight: 600 }}>{seg.label}</span>
                  </div>
                  <div
                    style={{
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: "13px",
                      fontVariantNumeric: "tabular-nums"
                    }}
                  >
                    {seg.value}
                    <span style={{ color: "#94a3b8", fontWeight: 500, marginLeft: "6px" }}>
                      ({Math.round((seg.value / derived.totalRecent) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* Branding */}
      <section>
        <article style={{ ...styles.card, padding: isMobile ? "18px" : "24px" }}>
          <SectionHeader
            eyebrow="Identitas"
            title="Branding & Sosial"
            subtitle="Atur identitas brand yang dipakai di seluruh frontend dan panel admin."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2fr) minmax(0, 1fr)",
              gap: "20px"
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
              <label
                style={{
                  display: "grid",
                  gap: "6px",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "13px",
                  gridColumn: isMobile ? "auto" : "span 2"
                }}
              >
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
                <span style={{ color: "#94a3b8", fontSize: "11.5px", fontWeight: 500 }}>
                  Format didukung: PNG, JPG, JPEG, WEBP, dan SVG. Maksimum 5 MB.
                </span>
              </label>
            </form>

            <div
              style={{
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                background: "linear-gradient(160deg, #f8fafc 0%, #eef2ff 100%)",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px"
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#64748b"
                }}
              >
                Pratinjau Identitas
              </div>

              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)"
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: previewLogoUrl ? "#ffffff" : "#eff6ff",
                    border: previewLogoUrl ? "1px solid #e2e8f0" : "1px solid #dbeafe",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "16px",
                    overflow: "hidden",
                    flexShrink: 0
                  }}
                >
                  {previewLogoUrl ? (
                    <img
                      src={previewLogoUrl}
                      alt={previewBrandName}
                      style={{ width: "44px", height: "44px", objectFit: "contain" }}
                    />
                  ) : (
                    previewBrandName.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#0f172a", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.01em" }}>
                    {previewBrandName}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "2px" }}>
                    Tampil di navbar, footer, & panel admin.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[
                  { label: "Instagram", url: brandingForm.instagramUrl, color: "#db2777", bg: "#fdf2f8" },
                  { label: "TikTok", url: brandingForm.tiktokUrl, color: "#0f172a", bg: "#f1f5f9" },
                  { label: "WhatsApp", url: brandingForm.whatsappUrl, color: "#15803d", bg: "#dcfce7" }
                ].map((social) => (
                  <span
                    key={social.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: social.url ? social.bg : "#f1f5f9",
                      color: social.url ? social.color : "#94a3b8",
                      fontSize: "11.5px",
                      fontWeight: 600
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "999px",
                        background: social.url ? social.color : "#cbd5e1"
                      }}
                    />
                    {social.label} {social.url ? "aktif" : "kosong"}
                  </span>
                ))}
              </div>

              <div
                style={{
                  marginTop: "auto",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.7)",
                  border: "1px dashed #cbd5e1",
                  fontSize: "12px",
                  color: "#475569",
                  lineHeight: 1.5
                }}
              >
                Pastikan logo memiliki latar transparan dan dimensi 1:1 untuk hasil terbaik di seluruh halaman.
              </div>
            </div>
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
                ...styles.button,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "#ffffff",
                opacity: saving ? 0.7 : 1,
                boxShadow: "0 12px 28px -16px rgba(37, 99, 235, 0.6)",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {saving ? (
                "Menyimpan..."
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Simpan Branding
                </>
              )}
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
