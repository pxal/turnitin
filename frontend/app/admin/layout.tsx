"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import ActionDialog from "../../components/ui/action-dialog";
import {
  apiBaseUrl,
  clearAdminSession,
  getStoredAdminAuth,
  storeAdminSession,
  withSessionRole
} from "../../lib/api";
import { useBranding } from "../../lib/hooks/useBranding";
import { useIsMobile } from "../../lib/hooks/useIsMobile";

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

type MenuItem = {
  label: string;
  href: string;
  description?: string;
  badge?: number;
  icon: (active: boolean) => ReactNode;
};

type HeaderNotificationItem = {
  id: string;
  publicId: string;
  paymentStatus: string;
  checkStatus: string;
  finalAmount: number;
  createdAt: string;
  user: {
    fullName: string;
  };
  package: {
    name: string;
  };
};

const ADMIN_NOTIF_STORAGE_KEY = "turnicheck:admin-notifications:seen";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function readSeenNotificationIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_NOTIF_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function storeSeenNotificationIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_NOTIF_STORAGE_KEY, JSON.stringify(ids.slice(0, 50)));
}

function SidebarIcon({
  active,
  children
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "10px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)" : "rgba(148, 163, 184, 0.08)",
        color: active ? "#ffffff" : "#94a3b8",
        flexShrink: 0,
        boxShadow: active ? "0 4px 12px rgba(37, 99, 235, 0.32)" : "none",
        transition: "background 0.2s ease, color 0.2s ease"
      }}
    >
      {children}
    </span>
  );
}

const menuGroups: MenuGroup[] = [
  {
    label: "Operasional",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        description: "Ringkasan",
        icon: (active) => (
          <SidebarIcon active={active}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 4h6v6H4V4Zm10 0h6v10h-6V4ZM4 14h6v6H4v-6Zm10 4h6v2h-6v-2Z" fill="currentColor" />
            </svg>
          </SidebarIcon>
        )
      },
      {
        label: "Kelola Paket",
        href: "/admin/packages",
        description: "Harga & voucher",
        icon: (active) => (
          <SidebarIcon active={active}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 2.2 5.6 2.8L12 10.8 6.4 8 12 5.2Zm-6 4.4 5 2.5v6.5l-5-2.5V9.6Zm7 8.9v-6.5l5-2.5v6.5l-5 2.5Z" fill="currentColor" />
            </svg>
          </SidebarIcon>
        )
      },
      {
        label: "Pesanan",
        href: "/admin/orders",
        description: "Order masuk",
        icon: (active) => (
          <SidebarIcon active={active}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 4h10l2 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8l2-4Zm0 4v10h10V8H7Zm2-2-.5 1h7L15 6H9Zm1 5h4v2h-4v-2Z" fill="currentColor" />
            </svg>
          </SidebarIcon>
        )
      }
    ]
  },
  {
    label: "Pertumbuhan",
    items: [
      {
        label: "Affiliate",
        href: "/admin/affiliates",
        description: "Mitra & komisi",
        icon: (active) => (
          <SidebarIcon active={active}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 19a5 5 0 0 1 10 0H4Zm11 0a4 4 0 0 1 5-3.87V19h-5Z" fill="currentColor" />
            </svg>
          </SidebarIcon>
        )
      },
      {
        label: "Gateway",
        href: "/admin/gateway",
        description: "Pembayaran",
        icon: (active) => (
          <SidebarIcon active={active}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2 1.5v2h12V8H6Zm0 5v4h5v-4H6Z" fill="currentColor" />
            </svg>
          </SidebarIcon>
        )
      },
      {
        label: "Notifikasi",
        href: "/admin/notification",
        description: "Pengumuman",
        icon: (active) => (
          <SidebarIcon active={active}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4a4 4 0 0 0-4 4v1.3c0 .7-.24 1.38-.67 1.92L6 13v1h12v-1l-1.33-1.78A3.2 3.2 0 0 1 16 9.3V8a4 4 0 0 0-4-4Zm0 16a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 20Z" fill="currentColor" />
            </svg>
          </SidebarIcon>
        )
      }
    ]
  }
];

const allMenuItems = menuGroups.flatMap((group) => group.items);

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const branding = useBranding();
  const isLoginPage = pathname === "/admin/login";
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>([]);
  const [unseenNotificationCount, setUnseenNotificationCount] = useState(0);

  useEffect(() => {
    if (isLoginPage) {
      setReady(true);
      return;
    }

    const cached = getStoredAdminAuth();
    if (!cached?.admin) {
      window.location.href = "/admin/login";
      return;
    }

    setReady(true);

    async function verifyAdminSession() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/session`, withSessionRole("admin"));
        const payload = await res.json().catch(() => null);

        if (res.status === 401 || res.status === 403) {
          clearAdminSession();
          window.location.href = "/admin/login";
          return;
        }

        if (!res.ok) {
          return;
        }

        if (!payload?.success || payload.role !== "admin" || !payload.admin) {
          clearAdminSession();
          window.location.href = "/admin/login";
          return;
        }

        storeAdminSession(payload.admin);
      } catch {
        // Keep cached session on transient failures.
      }
    }

    void verifyAdminSession();
  }, [isLoginPage]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, pathname]);

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/admin/orders?page=1&limit=6`, withSessionRole("admin"));
        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload?.success || !Array.isArray(payload.data)) {
          return;
        }

        if (cancelled) {
          return;
        }

        const items = payload.data as HeaderNotificationItem[];
        setNotifications(items);

        const seenIds = new Set(readSeenNotificationIds());
        const unseen = items.filter((item) => !seenIds.has(item.id)).length;
        setUnseenNotificationCount(unseen);
      } catch {
        // Ignore transient notification polling issues.
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isLoginPage, pathname]);

  function handleOpenNotifications() {
    const ids = notifications.map((item) => item.id);
    const mergedIds = Array.from(new Set([...readSeenNotificationIds(), ...ids]));
    storeSeenNotificationIds(mergedIds);
    setUnseenNotificationCount(0);
    setNotificationsOpen(true);
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#334155"
        }}
      >
        <div style={{ fontWeight: 700 }}>Memverifikasi sesi admin...</div>
      </div>
    );
  }

  const activeItem = allMenuItems.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`));
  const brandName = branding.brandName || "Verscan";
  const brandInitial = brandName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6fb",
        color: "#0f172a",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}
    >
      {isMobile && sidebarOpen ? (
        <button
          type="button"
          aria-label="Tutup menu admin"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            border: "none",
            background: "rgba(15, 23, 42, 0.55)",
            cursor: "pointer",
            backdropFilter: "blur(2px)"
          }}
        />
      ) : null}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: isMobile ? "min(86vw, 288px)" : "272px",
            background:
              "radial-gradient(120% 60% at 0% 0%, rgba(37, 99, 235, 0.18) 0%, rgba(11, 18, 32, 0) 60%), linear-gradient(180deg, #0b1220 0%, #0f172a 60%, #111c33 100%)",
            color: "#cbd5e1",
            display: "flex",
            flexDirection: "column",
            position: isMobile ? "fixed" : "sticky",
            top: 0,
            height: "100vh",
            zIndex: 80,
            transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
            transition: "transform 0.24s ease",
            boxShadow: isMobile ? "4px 0 24px rgba(0, 0, 0, 0.25)" : "none",
            overflowY: "auto",
            borderRight: "1px solid rgba(148, 163, 184, 0.08)"
          }}
        >
          <div
            style={{
              padding: "22px 20px 18px",
              borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
                fontWeight: 800,
                fontSize: "16px",
                boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)"
              }}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={brandName}
                  style={{ width: "42px", height: "42px", objectFit: "contain" }}
                />
              ) : (
                brandInitial
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
                {brandName}
              </div>
              <div
                style={{
                  fontSize: "10.5px",
                  color: "#94a3b8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em"
                }}
              >
                Admin Console
              </div>
            </div>
            {isMobile ? (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Tutup menu"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  background: "rgba(148, 163, 184, 0.08)",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>

          <div style={{ padding: "14px 16px 8px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.18)"
              }}
            >
              <span
                aria-hidden
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: "#10b981",
                  boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.18)",
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#a7f3d0" }}>Sistem aktif</div>
                <div style={{ fontSize: "10.5px", color: "#86efac", fontWeight: 500 }}>Semua layanan online</div>
              </div>
            </div>
          </div>

          <nav style={{ padding: "6px 12px 12px", display: "flex", flexDirection: "column", gap: "18px", flex: 1 }}>
            {menuGroups.map((group) => (
              <div key={group.label} style={{ display: "grid", gap: "2px" }}>
                <div style={{ padding: "0 12px 8px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em"
                    }}
                  >
                    {group.label}
                  </span>
                </div>
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        minHeight: "52px",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        border: "none",
                        background: active ? "rgba(37, 99, 235, 0.16)" : "transparent",
                        color: active ? "#ffffff" : "#cbd5e1",
                        transition: "background 0.18s ease, color 0.18s ease",
                        textDecoration: "none",
                        position: "relative",
                        boxShadow: active ? "inset 0 0 0 1px rgba(96, 165, 250, 0.18)" : "none"
                      }}
                    >
                      {item.icon(active)}
                      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontWeight: active ? 700 : 600,
                            fontSize: "13.5px",
                            letterSpacing: "-0.005em"
                          }}
                        >
                          {item.label}
                        </span>
                        {item.description ? (
                          <span
                            style={{
                              fontSize: "11px",
                              color: active ? "rgba(226, 232, 240, 0.7)" : "#64748b",
                              fontWeight: 500,
                              marginTop: "2px"
                            }}
                          >
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      {item.badge ? (
                        <span
                          style={{
                            minWidth: "22px",
                            height: "22px",
                            padding: "0 6px",
                            borderRadius: "999px",
                            background: "#2563eb",
                            color: "#ffffff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "11px"
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                      {active ? (
                        <span
                          aria-hidden="true"
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: "#60a5fa",
                            flexShrink: 0
                          }}
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div
            style={{
              marginTop: "auto",
              padding: "14px 16px 18px",
              borderTop: "1px solid rgba(148, 163, 184, 0.08)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(148, 163, 184, 0.12)",
                padding: "12px 14px"
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "13px",
                  flexShrink: 0
                }}
              >
                AR
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#f8fafc" }}>Admin Root</div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#94a3b8",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500
                  }}
                >
                  admin@{brandName.toLowerCase().replace(/\s+/g, "")}.io
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  fetch(`${apiBaseUrl}/api/auth/logout`, withSessionRole("admin", { method: "POST" }))
                    .catch(() => undefined)
                    .finally(() => {
                      clearAdminSession();
                      window.location.href = "/admin/login";
                    });
                }}
                title="Keluar panel"
                aria-label="Keluar panel"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  background: "rgba(148, 163, 184, 0.08)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4v-2H6V7h4V5Zm5.59 2.41L14.17 8.83 16.34 11H9v2h7.34l-2.17 2.17 1.42 1.42L20.17 12l-4.58-4.59Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <header
            style={{
              minHeight: "68px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "14px 16px" : "0 32px",
              gap: "16px",
              position: "sticky",
              top: 0,
              zIndex: 40,
              backdropFilter: "blur(14px)",
              background: "rgba(255, 255, 255, 0.92)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              {isMobile ? (
                <button
                  type="button"
                  aria-label="Buka menu admin"
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#475569",
                    fontSize: "18px",
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}

              <div style={{ minWidth: 0 }}>
                {!isMobile ? (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginBottom: "2px"
                    }}
                  >
                    {brandName} · Admin
                  </div>
                ) : null}
                <div style={{ fontSize: isMobile ? "16px" : "18px", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
                  {activeItem?.label || "Admin"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {!isMobile ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 14px",
                    height: "38px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#64748b",
                    fontSize: "12.5px",
                    fontWeight: 600
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Cari pesanan, paket, atau pengguna…
                </div>
              ) : null}

              <button
                type="button"
                aria-label="Notifikasi"
                onClick={handleOpenNotifications}
                style={{
                  position: "relative",
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 4a4 4 0 0 0-4 4v1.3c0 .7-.24 1.38-.67 1.92L6 13v1h12v-1l-1.33-1.78A3.2 3.2 0 0 1 16 9.3V8a4 4 0 0 0-4-4Zm0 16a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 20Z"
                    fill="currentColor"
                  />
                </svg>
                {unseenNotificationCount > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      minWidth: "16px",
                      height: "16px",
                      borderRadius: "999px",
                      background: "#ef4444",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "0 4px",
                      border: "2px solid #ffffff"
                    }}
                  >
                    {Math.min(unseenNotificationCount, 9)}
                  </span>
                ) : null}
              </button>
            </div>
          </header>

          <main style={{ padding: isMobile ? "16px" : "28px 32px 40px", flex: 1 }}>{children}</main>
        </div>
      </div>

      <ActionDialog
        open={notificationsOpen}
        title="Notifikasi Pesanan Baru"
        description="Pesanan terbaru yang masuk ke sistem akan muncul di sini."
        cancelLabel="Tutup"
        onClose={() => setNotificationsOpen(false)}
      >
        {notifications.length > 0 ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {notifications.map((item) => (
              <Link
                key={item.id}
                href="/admin/orders"
                onClick={() => setNotificationsOpen(false)}
                style={{
                  display: "grid",
                  gap: "6px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  padding: "12px 14px",
                  textDecoration: "none",
                  color: "inherit"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>
                    {item.user.fullName} memesan {item.package.name}
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: "24px",
                      padding: "0 8px",
                      borderRadius: "999px",
                      background: item.paymentStatus === "PAID" ? "#dcfce7" : "#f1f5f9",
                      color: item.paymentStatus === "PAID" ? "#166534" : "#475569",
                      fontSize: "11px",
                      fontWeight: 600,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.paymentStatus}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Invoice #{item.publicId} • {formatNotificationDate(item.createdAt)} • {item.checkStatus}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ color: "#64748b", fontWeight: 600 }}>Belum ada notifikasi pesanan baru.</div>
        )}
      </ActionDialog>
    </div>
  );
}
