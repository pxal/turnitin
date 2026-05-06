import type { Metadata } from "next";
import UploadForm from "../../components/upload-form";
import AuthGuard from "../../components/auth-guard";
import PackageSidebar from "../../components/package-sidebar";

export const metadata: Metadata = {
  title: "Upload Dokumen",
  description: "Upload dokumen PDF Anda dan dapatkan laporan plagiasi Turnitin secara instan.",
  alternates: {
    canonical: "/upload"
  }
};

export default function UploadPage() {
  return (
    <AuthGuard>
      <main style={{ minHeight: "100vh", padding: "100px 0 80px", background: "var(--bg-main)" }}>
        <div className="container">

          {/* Page Header */}
          <div style={{ marginBottom: "48px" }}>

            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900,
              marginBottom: "12px", color: "var(--text-main)", lineHeight: 1.2
            }}>
              Upload Dokumen Anda
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "17px", maxWidth: "560px" }}>
              Pilih file PDF, kami deteksi ukurannya, dan sistem langsung siapkan pembayaran. Proses sepenuhnya otomatis.
            </p>
          </div>

          {/* Main Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 0.6fr)",
            gap: "32px",
            alignItems: "start"
          }} className="upload-grid">

            {/* Upload Form Card */}
            <UploadForm />

            {/* Sidebar Info */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Pricing Table */}
              <PackageSidebar />

              {/* Security Info */}
              <div style={{
                background: "var(--surface)", borderRadius: "20px",
                border: "1px solid var(--border)", padding: "28px"
              }}>
                <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "20px", color: "var(--text-main)", letterSpacing: "0.5px" }}>
                  JAMINAN KEAMANAN
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    { icon: "🗑️", text: "File dihapus otomatis setelah laporan selesai" },
                    { icon: "🔒", text: "Data Anda tidak pernah dibagikan ke pihak ketiga" },
                    { icon: "✅", text: "Menggunakan sistem Turnitin resmi dan terpercaya" },
                    { icon: "⚡", text: "Antrian diproses sesuai antrian server, estimasi 5-20 menit" },
                  ].map((item) => (
                    <div key={item.icon} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>{item.icon}</span>
                      <span style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.6 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .upload-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </AuthGuard>
  );
}
