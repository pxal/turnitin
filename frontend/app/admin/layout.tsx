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

type MenuItem = {
  label: string;
  href: string;
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
        width: "20px",
        height: "20px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: active ? "#6ee7c8" : "#8ea3c2",
        flexShrink: 0
      }}
    >
      {children}
    </span>
  );
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
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
    icon: (active) => (
      <SidebarIcon active={active}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 4h10l2 4v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8l2-4Zm0 4v10h10V8H7Zm2-2-.5 1h7L15 6H9Zm1 5h4v2h-4v-2Z" fill="currentColor" />
        </svg>
      </SidebarIcon>
    )
  },
  {
    label: "Affiliate",
    href: "/admin/affiliates",
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
    icon: (active) => (
      <SidebarIcon active={active}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 4a4 4 0 0 0-4 4v1.3c0 .7-.24 1.38-.67 1.92L6 13v1h12v-1l-1.33-1.78A3.2 3.2 0 0 1 16 9.3V8a4 4 0 0 0-4-4Zm0 16a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 20Z" fill="currentColor" />
        </svg>
      </SidebarIcon>
    )
  }
];

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
          background:
            "radial-gradient(circle at top left, rgba(86, 222, 191, 0.12), transparent 28%), #0d1424",
          color: "#d7e2f0"
        }}
      >
        <div style={{ fontWeight: 700 }}>Memverifikasi sesi admin...</div>
      </div>
    );
  }

  const activeItem = menuItems.find((item) => pathname === item.href || pathname?.startsWith(`${item.href}/`));
  const brandName = branding.brandName || "Verscan";

  return (
    <div style={{ minHeight: "100vh", background: "#0d1424", color: "#f8fbff" }}>
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
            background: "rgba(5, 10, 20, 0.66)",
            cursor: "pointer"
          }}
        />
      ) : null}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: isMobile ? "min(86vw, 300px)" : "252px",
            background: "#182235",
            borderRight: "1px solid rgba(143, 163, 194, 0.16)",
            display: "flex",
            flexDirection: "column",
            position: isMobile ? "fixed" : "sticky",
            top: 0,
            height: "100vh",
            zIndex: 80,
            transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
            transition: "transform 0.24s ease",
            boxShadow: isMobile ? "0 18px 60px rgba(0, 0, 0, 0.38)" : "none"
          }}
        >
          <div
            style={{
              minHeight: "78px",
              padding: "20px 22px",
              borderBottom: "1px solid rgba(143, 163, 194, 0.14)",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "999px",
                background: "#ffffff",
                boxShadow: "0 10px 24px rgba(0, 0, 0, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d9e6f4",
                overflow: "hidden",
                flexShrink: 0
              }}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={brandName}
                  style={{ width: "62px", height: "62px", objectFit: "contain" }}
                />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 2.7 20 7.2v9.6l-8 4.5-8-4.5V7.2l8-4.5Zm0 2.3L6 8.36v7.28L12 19l6-3.36V8.36L12 5Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#f7fbff" }}>{brandName}</div>
              <div style={{ fontSize: "12px", color: "#8ea3c2" }}>Admin workspace</div>
            </div>
          </div>

          <nav style={{ padding: "22px 12px", display: "grid", gap: "6px" }}>
            {menuItems.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minHeight: "46px",
                    padding: "0 12px",
                    borderRadius: "14px",
                    border: active ? "1px solid rgba(110, 231, 200, 0.75)" : "1px solid transparent",
                    background: active ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: active ? "#f8fbff" : "#9ab0cf",
                    boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.05)" : "none"
                  }}
                >
                  {item.icon(active)}
                  <span style={{ fontWeight: active ? 700 : 600, fontSize: "15px", flex: 1 }}>{item.label}</span>
                  {item.badge ? (
                    <span
                      style={{
                        minWidth: "24px",
                        height: "24px",
                        padding: "0 8px",
                        borderRadius: "999px",
                        background: "#69ebc0",
                        color: "#0f2530",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "12px"
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div
            style={{
              marginTop: "auto",
              padding: "16px",
              borderTop: "1px solid rgba(143, 163, 194, 0.14)"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.04)",
                padding: "12px 14px"
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #69ebc0, #35c5f0)",
                  color: "#072332",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800
                }}
              >
                AR
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#f5f9ff" }}>Admin Root</div>
                <div style={{ fontSize: "12px", color: "#8ea3c2", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#95a9c7",
                  cursor: "pointer",
                  padding: 0,
                  width: "24px",
                  height: "24px"
                }}
                aria-label="Keluar panel"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4v-2H6V7h4V5Zm5.59 2.41L14.17 8.83 16.34 11H9v2h7.34l-2.17 2.17 1.42 1.42L20.17 12l-4.58-4.59Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <div style={{ flex: 1, minWidth: 0 }}>
          <header
            style={{
              minHeight: "82px",
              borderBottom: "1px solid rgba(143, 163, 194, 0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "16px" : "0 32px",
              gap: "16px",
              position: "sticky",
              top: 0,
              zIndex: 40,
              backdropFilter: "blur(16px)",
              background: "rgba(13, 20, 36, 0.84)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
              {isMobile ? (
                <button
                  type="button"
                  aria-label="Buka menu admin"
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    border: "1px solid rgba(143, 163, 194, 0.2)",
                    background: "#182235",
                    color: "#f6fbff",
                    fontSize: "20px",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                >
                  ≡
                </button>
              ) : null}

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? "24px" : "18px", fontWeight: 800, color: "#f8fbff" }}>
                  {activeItem?.label || "Admin"}
                </div>
                {!isMobile ? (
                  <div style={{ fontSize: "14px", color: "#8196b4" }}>Selamat datang kembali, Admin 👋</div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button
                type="button"
                aria-label="Notifikasi"
                onClick={handleOpenNotifications}
                style={{
                  position: "relative",
                  width: "38px",
                  height: "38px",
                  borderRadius: "12px",
                  border: "1px solid rgba(143, 163, 194, 0.16)",
                  background: "#182235",
                  color: "#d8e4f2",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 4a4 4 0 0 0-4 4v1.3c0 .7-.24 1.38-.67 1.92L6 13v1h12v-1l-1.33-1.78A3.2 3.2 0 0 1 16 9.3V8a4 4 0 0 0-4-4Zm0 16a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 20Z"
                    fill="currentColor"
                  />
                </svg>
                <span
                  style={{
                    position: "absolute",
                    top: "9px",
                    right: "10px",
                    minWidth: unseenNotificationCount > 0 ? "18px" : "7px",
                    height: unseenNotificationCount > 0 ? "18px" : "7px",
                    borderRadius: "999px",
                    background: "#ff6e6a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: unseenNotificationCount > 0 ? "0 4px" : 0
                  }}
                >
                  {unseenNotificationCount > 0 ? Math.min(unseenNotificationCount, 9) : ""}
                </span>
              </button>
            </div>
          </header>

          <main style={{ padding: isMobile ? "18px 14px 28px" : "24px 32px 36px" }}>{children}</main>
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
          <div style={{ display: "grid", gap: "12px" }}>
            {notifications.map((item) => (
              <Link
                key={item.id}
                href="/admin/orders"
                onClick={() => setNotificationsOpen(false)}
                style={{
                  display: "grid",
                  gap: "6px",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  padding: "14px 16px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    {item.user.fullName} memesan {item.package.name}
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: "26px",
                      padding: "0 10px",
                      borderRadius: "999px",
                      background: item.paymentStatus === "PAID" ? "#dcfce7" : "#e2e8f0",
                      color: item.paymentStatus === "PAID" ? "#166534" : "#475569",
                      fontSize: "11px",
                      fontWeight: 800,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.paymentStatus}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  Invoice #{item.publicId} • {formatNotificationDate(item.createdAt)} • {item.checkStatus}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ color: "#64748b", fontWeight: 700 }}>Belum ada notifikasi pesanan baru.</div>
        )}
      </ActionDialog>
    </div>
  );
}
