"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiBaseUrl, getStoredUserAuth, withCredentials } from "../lib/api";

type StatusData = {
  paymentStatus: string;
  checkStatus: string;
  fileName: string;
  reportUrl: string | null;
  similarityScore?: number | null;
  checkerJobId?: string | null;
  publicId?: string;
};

export default function ProcessingStatus({ checkRequestId }: { checkRequestId: string }) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState("");
  const [dots, setDots] = useState("");

  // Animation for the "..." dots
  useEffect(() => {
    const id = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const loadStatus = useCallback(async () => {
    const auth = getStoredUserAuth();
    if (!auth?.user) {
      setError("Sesi Anda sudah berakhir. Silakan login kembali.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/checks/${checkRequestId}`, withCredentials());
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Gagal mengambil status request.");
      }

      setStatus({
        paymentStatus: payload.data.paymentStatus,
        checkStatus: payload.data.checkStatus,
        fileName: payload.data.originalName,
        reportUrl: payload.data.reportDownloadUrl || null,
        similarityScore: payload.data.similarityScore || null,
        checkerJobId: payload.data.checkerJobId || null,
        publicId: payload.data.publicId || checkRequestId
      });

      // If still processing, trigger the backend to sync status from Turnitin if needed
      if (payload.data.checkStatus === "PROCESSING" && payload.data.checkerJobId) {
        // We call the status endpoint which updates the DB
        await fetch(`${apiBaseUrl}/api/checks/${checkRequestId}/status`, withCredentials()).catch(() => {});
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat status.");
    }
  }, [checkRequestId]);

  useEffect(() => {
    if (!checkRequestId) return;
    loadStatus();
    const intervalId = setInterval(loadStatus, 10000);
    return () => clearInterval(intervalId);
  }, [checkRequestId, loadStatus]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "24px", border: "1px solid #fee2e2" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 style={{ color: "#b91c1c", marginBottom: "8px" }}>Terjadi Kesalahan</h2>
        <p style={{ color: "#64748b", marginBottom: "24px" }}>{error}</p>
        <button onClick={() => window.location.reload()} className="button button-primary">Coba Lagi</button>
      </div>
    );
  }

  if (!status) return null;

  const isCompleted = status.checkStatus === "COMPLETED";
  const isFailed = status.checkStatus === "FAILED";
  const isWaiting = status.checkStatus === "WAITING_PAYMENT" || status.paymentStatus === "PENDING";

  // Progress Steps logic
  const steps = [
    { label: "Pembayaran Diterima", active: status.paymentStatus === "PAID" },
    { label: "Analisis Dokumen", active: status.checkStatus === "PROCESSING" || status.checkStatus === "COMPLETED" },
    { label: "Laporan Siap", active: status.checkStatus === "COMPLETED" }
  ];

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      
      {/* 1. PROCESSING STATE */}
      {!isCompleted && !isFailed && (
        <div style={{ textAlign: "center", animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ marginBottom: "32px" }}>
            <div style={{ 
              width: "100px", 
              height: "100px", 
              margin: "0 auto 24px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <div style={{ 
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: "3px solid #eef4ff",
                borderTopColor: "#0b4fd9",
                animation: "spin 1.2s linear infinite"
              }} />
              <div style={{ 
                width: "70px",
                height: "70px",
                background: "white",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                zIndex: 1
              }}>📄</div>
            </div>
            
            <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#1e293b", marginBottom: "8px", letterSpacing: "-0.5px" }}>
              {isWaiting ? "Menunggu Pembayaran" : `Sedang Memproses${dots}`}
            </h1>
            <p style={{ color: "#64748b", fontSize: "16px", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
              {isWaiting 
                ? "Silakan selesaikan pembayaran Anda agar kami dapat segera memproses dokumen ini."
                : "Dokumen Anda sedang dianalisis, Estimasi waktu 10 - 20 Menit."}
            </p>
          </div>

          {/* Step Progress Bar Card */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            padding: "32px 24px", 
            background: "white", 
            borderRadius: "24px", 
            border: "1px solid #e2e8f0",
            marginBottom: "24px",
            position: "relative",
            boxShadow: "0 10px 30px -5px rgba(0,0,0,0.04)"
          }}>
            <div style={{ position: "absolute", top: "48px", left: "15%", right: "15%", height: "2px", background: "#f1f5f9", zIndex: 0 }} />
            {steps.map((step, i) => (
              <div key={i} style={{ zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", flex: 1 }}>
                <div style={{ 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "50%", 
                  background: step.active ? "#0b4fd9" : "white",
                  border: `2px solid ${step.active ? "#0b4fd9" : "#e2e8f0"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: step.active ? "white" : "#94a3b8",
                  fontSize: "13px",
                  fontWeight: 800,
                  transition: "all 0.4s ease",
                  boxShadow: step.active ? "0 0 15px rgba(99, 102, 241, 0.4)" : "none"
                }}>
                  {step.active ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: step.active ? "#1e293b" : "#94a3b8" }}>{step.label}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "#eef4ff", padding: "16px 24px", borderRadius: "18px", border: "1px solid #bfdbfe", fontSize: "14px", color: "#0b4fd9", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <span style={{ fontSize: "18px" }}>💡</span> Tips: Anda dapat menutup halaman ini. Kami akan memproses file Anda di latar belakang.
          </div>

        </div>
      )}

      {/* 2. SUCCESS/RESULT STATE */}
      {isCompleted && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ 
            background: "linear-gradient(135deg, #1e293b, #0f172a)", 
            borderRadius: "32px", 
            padding: "48px", 
            color: "white", 
            textAlign: "center",
            marginBottom: "32px",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)"
          }}>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}>🎉</div>
            <h1 style={{ fontSize: "36px", fontWeight: 900, marginBottom: "12px", letterSpacing: "-1px" }}>Laporan Selesai!</h1>
            <p style={{ color: "#94a3b8", fontSize: "18px", marginBottom: "40px" }}>Analisis keaslian untuk dokumen <strong>{status.fileName}</strong> telah berhasil dilakukan.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "400px", margin: "0 auto" }}>
              {status.reportUrl && (
                <a 
                  href={status.reportUrl} 
                  download
                  className="button"
                  style={{ 
                    background: "linear-gradient(135deg, #0b4fd9, #38bdf8)", 
                    padding: "20px", 
                    fontSize: "18px", 
                    fontWeight: 900, 
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    boxShadow: "0 10px 20px -5px rgba(11, 79, 217, 0.4)"
                  }}
                >
                  📥 Unduh Laporan (PDF)
                </a>
              )}
              <Link 
                href="/upload" 
                style={{ color: "#94a3b8", textDecoration: "none", fontWeight: 700, fontSize: "15px", marginTop: "8px" }}
              >
                Cek Dokumen Lainnya →
              </Link>
            </div>
          </div>

          {/* Trust Badge / Security Card */}
          <div style={{ background: "white", borderRadius: "24px", padding: "32px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "24px" }}>
            <div style={{ fontSize: "40px" }}>🛡️</div>
            <div>
              <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-main)", marginBottom: "4px" }}>Dokumen Anda Aman</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6 }}>Laporan ini bersifat rahasia dan tidak akan disimpan secara permanen di server kami. Data akan dihapus otomatis dalam 24 jam.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. FAILED STATE */}
      {isFailed && (
        <div style={{ textAlign: "center", padding: "60px 40px", background: "white", borderRadius: "32px", border: "1px solid #fee2e2" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>❌</div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#b91c1c", marginBottom: "16px" }}>Gagal Memproses</h1>
          <p style={{ color: "#64748b", fontSize: "17px", marginBottom: "32px", maxWidth: "500px", margin: "0 auto 32px" }}>
            Maaf, sistem kami mengalami kendala saat menganalisis dokumen Anda. Hal ini bisa terjadi karena file korup atau server Turnitin sedang sibuk.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <button onClick={() => window.location.reload()} className="button button-primary" style={{ padding: "14px 32px" }}>Coba Lagi</button>
            <Link href="/upload" className="button secondary" style={{ padding: "14px 32px" }}>Kembali ke Upload</Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
