"use client";

import { useEffect, useRef } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiBaseUrl, storeUserSession, withCredentials } from "../lib/api";
import { useBranding } from "../lib/hooks/useBranding";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              shape?: string;
              text?: string;
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const branding = useBranding();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    setError("");

    if (!clientId) {
      setError("Google login belum dikonfigurasi. Isi NEXT_PUBLIC_GOOGLE_CLIENT_ID terlebih dahulu.");
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      renderButton(clientId);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => renderButton(clientId);
    document.body.appendChild(script);

    function renderButton(id: string) {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: id,
        callback: async (response) => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/auth/google`, {
              ...withCredentials(),
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: response.credential }),
            });
            const payload = await res.json();
            if (!res.ok || !payload.success) throw new Error(payload.message || "Login gagal.");
            storeUserSession(payload.user);
            window.dispatchEvent(new Event("turnicheck:auth-changed"));
            onClose();
            router.push("/upload");
          } catch (err) {
            console.error(err);
            setError(
              err instanceof Error
                ? err.message
                : "Login Google gagal. Coba lagi beberapa saat."
            );
          }
        },
      });
      buttonRef.current.innerHTML = "";
      try {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 320,
        });
      } catch (error) {
        console.error(error);
        setError(
          window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "Google Sign-In gagal dimuat di localhost. Pastikan Authorized JavaScript origins di Google Cloud sudah menambahkan http://localhost:3000."
            : "Google Sign-In gagal dimuat. Periksa konfigurasi client Google."
        );
      }
    }
  }, [isOpen, onClose, router]);

  // Close on ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--surface, white)",
          borderRadius: "24px",
          padding: "48px 40px",
          maxWidth: "440px",
          width: "90%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
          position: "relative",
          animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "20px", right: "20px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: "24px", lineHeight: 1,
            padding: "4px 8px", borderRadius: "8px",
          }}
          aria-label="Tutup"
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              style={{ width: "124px", height: "124px", objectFit: "contain", margin: "0 auto 16px", display: "block" }}
            />
          ) : null}
          <h2 style={{
            fontSize: "26px", fontWeight: 900, marginBottom: "10px",
            color: "var(--text-main)",
          }}>
            Masuk ke {branding.brandName}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
            Gunakan akun Google Anda untuk mulai memeriksa keaslian dokumen dengan sistem Turnitin asli.
          </p>
        </div>

        {/* Google Sign-In Button */}
        <div
          style={{
            display: "flex", justifyContent: "center",
            minHeight: "52px", marginBottom: "24px",
          }}
        >
          <div ref={buttonRef} />
        </div>

        {error ? (
          <div style={{
            marginBottom: "20px",
            padding: "12px 14px",
            borderRadius: "14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: "13px",
            lineHeight: 1.6,
            fontWeight: 700
          }}>
            {error}
          </div>
        ) : null}

        <p style={{
          textAlign: "center", fontSize: "13px",
          color: "var(--text-muted)", lineHeight: 1.6
        }}>
          Dengan masuk, Anda menyetujui{" "}
          <a href="#" style={{ color: "var(--primary)" }}>Ketentuan Layanan</a>
          {" "}dan{" "}
          <a href="#" style={{ color: "var(--primary)" }}>Kebijakan Privasi</a>
          {" "}kami. Data Anda dijaga ketat.
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
