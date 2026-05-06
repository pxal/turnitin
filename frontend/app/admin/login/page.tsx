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
      background: "#f1f5f9",
      padding: "24px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        background: "#ffffff",
        borderRadius: "20px",
        border: "1px solid #e2e8f0",
        padding: "40px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
        textAlign: "center"
      }}>
        <div style={{ marginBottom: "32px" }}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              style={{ width: "72px", height: "72px", objectFit: "contain", margin: "0 auto 16px", display: "block" }}
            />
          ) : (
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#eff6ff",
              border: "1px solid #dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2.7 20 7.2v9.6l-8 4.5-8-4.5V7.2l8-4.5Zm0 2.3L6 8.36v7.28L12 19l6-3.36V8.36L12 5Z" fill="#2563eb" />
              </svg>
            </div>
          )}
          <h1 style={{ color: "#0f172a", fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>{branding.brandName} Admin</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Masuk ke panel kontrol manajemen</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ 
              background: "#fef2f2", 
              border: "1px solid #fecaca", 
              color: "#991b1b", 
              padding: "12px", 
              borderRadius: "10px", 
              fontSize: "13px", 
              fontWeight: 600,
              textAlign: "left"
            }}>
              {error}
            </div>
          )}

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", color: "#64748b", fontSize: "12px", fontWeight: 600, marginBottom: "6px", paddingLeft: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>EMAIL ADDRESS</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@verscan.com" 
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#2563eb"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <div style={{ textAlign: "left" }}>
            <label style={{ display: "block", color: "#64748b", fontSize: "12px", fontWeight: 600, marginBottom: "6px", paddingLeft: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>PASSWORD</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => e.target.style.borderColor = "#2563eb"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.8 : 1,
              transition: "opacity 0.2s"
            }}
          >
            {loading ? (
              <>
                <div style={{ width: "18px", height: "18px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Mengautentikasi...
              </>
            ) : "Masuk Dashboard"}
          </button>
        </form>

        <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
          <p style={{ color: "#94a3b8", fontSize: "12px" }}>
            Hanya personil terotorisasi yang diijinkan masuk.
          </p>
          <Link href="/" style={{ color: "#2563eb", textDecoration: "none", fontSize: "13px", fontWeight: 600, marginTop: "12px", display: "inline-block" }}>
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
