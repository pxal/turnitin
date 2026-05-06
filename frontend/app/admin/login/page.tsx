"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiBaseUrl, storeAdminSession, withCredentials } from "../../../lib/api";
import { useBranding } from "../../../lib/hooks/useBranding";

export default function AdminLoginPage() {
  const router = useRouter();
  const branding = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/admin/login`, {
        ...withCredentials(),
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Email atau password salah. Coba lagi.");
      }

      storeAdminSession(payload.admin);
      router.push("/admin/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login admin gagal.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at top right, #1e293b, #0f172a)",
      padding: "24px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: "32px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "48px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        textAlign: "center"
      }}>
        {/* Logo Section */}
        <div style={{ marginBottom: "40px" }}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              style={{ width: "82px", height: "82px", objectFit: "contain", margin: "0 auto 20px", display: "block" }}
            />
          ) : null}
          <h1 style={{ color: "white", fontSize: "28px", fontWeight: 900, marginBottom: "8px", letterSpacing: "-1px" }}>{branding.brandName} Admin</h1>
          <p style={{ color: "#94a3b8", fontSize: "15px" }}>Masuk ke panel kontrol manajemen</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {error && (
            <div style={{ 
              background: "rgba(239, 68, 68, 0.1)", 
              border: "1px solid rgba(239, 68, 68, 0.2)", 
              color: "#f87171", 
              padding: "12px", 
              borderRadius: "12px", 
              fontSize: "13px", 
              fontWeight: 600 
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", fontWeight: 700, marginBottom: "8px", paddingLeft: "4px" }}>EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@verscan.com" 
              required
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: "14px",
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#0b4fd9"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", fontWeight: 700, marginBottom: "8px", paddingLeft: "4px" }}>PASSWORD</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              style={{
                width: "100%",
                padding: "16px 20px",
                borderRadius: "14px",
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "white",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#0b4fd9"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: "100%",
              padding: "18px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0b4fd9, #083baf)",
              color: "white",
              fontSize: "16px",
              fontWeight: 800,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 10px 20px -5px rgba(79, 70, 229, 0.4)",
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
          >
            {loading ? (
              <>
                <div style={{ width: "20px", height: "20px", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Mengautentikasi...
              </>
            ) : "Masuk Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: "40px", paddingTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            Hanya personil terotorisasi yang diijinkan masuk. Sistem memonitor aktivitas login untuk keamanan.
          </p>
          <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "13px", fontWeight: 600, marginTop: "16px", display: "inline-block" }}>
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
