"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoginModal from "./login-modal";
import { useAuth } from "../lib/hooks/useAuth";
import { useBranding } from "../lib/hooks/useBranding";
import { useIsMobile } from "../lib/hooks/useIsMobile";

export default function Navbar() {
  const [showModal, setShowModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user, logout } = useAuth();
  const branding = useBranding();
  const router = useRouter();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setShowMobileMenu(false);
    router.push("/");
  };

  return (
    <>
      <header className="navbar">
        <div className="container">
          <Link href="/" className="navbar-brand text-gradient">
            <span
              style={{
                width: "64px",
                height: "64px",
                overflow: "visible",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.brandName}
                  style={{ width: "96px", height: "96px", objectFit: "contain", flexShrink: 0 }}
                />
              ) : (
                <span style={{ width: "96px", height: "96px", display: "block", opacity: 0, pointerEvents: "none" }} aria-hidden="true" />
              )}
            </span>
          </Link>
          <nav className="navbar-links">
            {user ? (
              isMobile ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(11,79,217,0.1)", padding: "6px 12px", borderRadius: "999px", border: "1px solid rgba(11,79,217,0.2)", maxWidth: "180px" }}>
                    {user.avatarUrl && <img src={user.avatarUrl} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0 }} />}
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.fullName}</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Buka menu akun"
                    onClick={() => setShowMobileMenu((prev) => !prev)}
                    style={{ width: "40px", height: "40px", borderRadius: "12px", border: "1px solid rgba(11,79,217,0.16)", background: "rgba(255,255,255,0.9)", color: "var(--text-main)", fontSize: "20px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    ≡
                  </button>
                  {showMobileMenu ? (
                    <>
                      <button
                        type="button"
                        aria-label="Tutup menu akun"
                        onClick={() => setShowMobileMenu(false)}
                        style={{ position: "fixed", inset: 0, background: "transparent", border: "none", padding: 0, zIndex: 79 }}
                      />
                      <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, minWidth: "190px", background: "rgba(255,255,255,0.96)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: "18px", boxShadow: "0 18px 40px rgba(15,23,42,0.12)", padding: "10px", zIndex: 80, backdropFilter: "blur(16px)" }}>
                        <Link
                          href="/history"
                          onClick={() => setShowMobileMenu(false)}
                          style={{ display: "block", padding: "12px 14px", borderRadius: "12px", fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}
                        >
                          Brankas
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMobileMenu(false);
                            setShowLogoutConfirm(true);
                          }}
                          style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "12px 14px", borderRadius: "12px", color: "#dc2626", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
                        >
                          Keluar
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <Link href="/history" style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", textDecoration: "none" }}>
                    Brankas
                  </Link>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(11,79,217,0.1)", padding: "6px 16px", borderRadius: "99px", border: "1px solid rgba(11,79,217,0.2)" }}>
                      {user.avatarUrl && <img src={user.avatarUrl} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%" }} />}
                      <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--primary)" }}>{user.fullName}</span>
                    </div>
                    <button 
                      onClick={() => setShowLogoutConfirm(true)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "4px 8px" }}
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              )
            ) : (
              <button
                className="button button-primary"
                onClick={() => setShowModal(true)}
                style={{ padding: "8px 20px", fontSize: "14px", cursor: "pointer" }}
              >
                Akses Sekarang
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease"
        }}>
          <div className="glass" style={{
            width: "360px", padding: "40px", borderRadius: "24px",
            textAlign: "center", border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
          }}>
            <div style={{ fontSize: "40px", marginBottom: "20px" }}>👋</div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px", color: "white" }}>Yakin ingin keluar?</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", marginBottom: "32px", lineHeight: 1.6 }}>
              Anda harus masuk kembali untuk mengakses riwayat dan melakukan pengecekan baru.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="button"
                style={{ flex: 1, background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Batal
              </button>
              <button 
                onClick={handleLogout}
                className="button"
                style={{ flex: 1, background: "#ef4444", color: "white", border: "none" }}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
