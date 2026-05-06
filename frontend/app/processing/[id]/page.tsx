import type { Metadata } from "next";
import { Suspense } from "react";
import ProcessingStatus from "../../../components/processing-status";
import AuthGuard from "../../../components/auth-guard";

export const metadata: Metadata = {
  title: "Status Pengecekan",
  description: "Pantau proses pengecekan dokumen Turnitin Anda secara real-time.",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AuthGuard>
      <main className="container" style={{ padding: "100px 0 80px" }}>
        <Suspense fallback={
          <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #e5e7eb", borderTopColor: "#0b4fd9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#6b7280" }}>Menghubungkan ke server...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        }>
          <ProcessingStatus checkRequestId={id} />
        </Suspense>
      </main>
    </AuthGuard>
  );
}
