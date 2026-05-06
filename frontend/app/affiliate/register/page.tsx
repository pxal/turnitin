"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AffiliatePageShell from "../../../components/affiliate/page-shell";
import { apiBaseUrl, storeAffiliateSession, withCredentials } from "../../../lib/api";
import { AFFILIATE_AUTH_CHANGED_EVENT } from "../../../lib/hooks/useAffiliateAuth";

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/affiliate/register`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.affiliate) {
        throw new Error(payload.message || "Pendaftaran affiliate gagal.");
      }

      storeAffiliateSession(payload.affiliate);
      window.dispatchEvent(new Event(AFFILIATE_AUTH_CHANGED_EVENT));
      router.replace("/affiliate/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pendaftaran affiliate gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AffiliatePageShell
      eyebrow="JOIN THE TEAM"
      title={
        <>
          Mulai Perjalanan <span className="text-gradient">Affiliate Anda</span>
        </>
      }
      description="Daftar sekarang dan dapatkan akses instan ke dashboard affiliate Verscan. Bagikan manfaat, raih komisi."
      align="center"
      maxWidth="800px"
    >
      <div className="animate-fade-up" style={{ display: "flex", justifyContent: "center" }}>
        <div className="glass" style={{ 
          borderRadius: "32px", 
          padding: "48px", 
          border: "1px solid rgba(255,255,255,0.6)", 
          width: "100%", 
          maxWidth: "540px",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative Blobs */}
          <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "150px", height: "150px", background: "var(--primary)", opacity: 0.1, filter: "blur(40px)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: "-50px", left: "-50px", width: "150px", height: "150px", background: "var(--accent)", opacity: 0.1, filter: "blur(40px)", borderRadius: "50%" }} />

          <div style={{ textAlign: "center", marginBottom: "40px", position: "relative", zIndex: 1 }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "20px", 
              background: "linear-gradient(135deg, var(--primary), var(--accent))", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center", 
              marginBottom: "20px",
              boxShadow: "0 10px 20px rgba(99, 102, 241, 0.2)"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
            </div>
            <h2 style={{ fontSize: "28px", fontWeight: 900, marginBottom: "12px" }}>Buat Akun Baru</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>Lengkapi data di bawah untuk bergabung dengan kami.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px", position: "relative", zIndex: 1 }}>
            <div className="field">
              <label style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>Alamat Email</label>
              <input
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>Username</label>
              <input
                type="text"
                placeholder="username_affiliate"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="field">
                <label style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>Konfirmasi</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>

            {message ? (
              <div style={{ 
                padding: "16px", 
                borderRadius: "16px", 
                background: "rgba(239,68,68,0.05)", 
                border: "1px solid rgba(239,68,68,0.15)", 
                color: "#dc2626", 
                fontSize: "14px",
                fontWeight: 600,
                textAlign: "center"
              }}>
                {message}
              </div>
            ) : null}

            <button 
              type="submit" 
              className="button button-primary" 
              style={{ width: "100%", marginTop: "10px", padding: "18px" }} 
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <div style={{ width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin-slow 1s linear infinite" }} />
                   Mendaftar...
                </span>
              ) : "Daftar & Masuk Dashboard"}
            </button>
          </form>

          <div style={{ marginTop: "32px", textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: "24px", position: "relative", zIndex: 1 }}>
            <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>
              Sudah punya akun?{" "}
              <Link href="/affiliate/login" style={{ color: "var(--primary)", fontWeight: 800, textDecoration: "underline" }}>
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AffiliatePageShell>
  );
}

