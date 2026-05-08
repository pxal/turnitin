"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, formatRupiah } from "../../lib/api";

type PackageItem = {
  id: string;
  name: string;
  maxFileSizeMb: number;
  price: number;
};

export default function Pricing() {
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    async function loadPackages() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/packages`);
        const payload = await response.json();

        if (response.ok && payload.success) {
          setPackages(payload.data || []);
        }
      } catch (error) {
        console.error("Failed to load pricing packages:", error);
      }
    }

    void loadPackages();
  }, []);

  return (
    <section className="section">
      <div className="container">
        <div className="section-header fade-in" style={{ textAlign: "center", marginBottom: "64px" }}>
          <h2 className="section-title" style={{ fontSize: "2.5rem", fontWeight: 900 }}>Pricing</h2>
          <p className="section-subtitle">Pilih sesuai kapasitas naskah Anda. Tanpa langganan bulanan.</p>
          <span
            className="section-title-underline"
            style={{
              display: "block",
              width: "80px",
              height: "4px",
              background: "var(--primary)",
              margin: "16px auto",
              borderRadius: "2px"
            }}
          ></span>
        </div>
        <div className="pricing-flex">
          {packages.map((pkg, index) => {
            const featured = index === packages.length - 1;

            return (
              <div key={pkg.id} className={`pricing-card fade-in ${featured ? "featured" : "glass"}`} style={{ animationDelay: `${index * 0.1}s` }}>
                {featured && (
                  <div style={{ position: "absolute", top: "-16px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, var(--accent), var(--primary))", color: "white", padding: "6px 20px", borderRadius: "999px", fontSize: "13px", fontWeight: 800, letterSpacing: "1px" }}>
                    PALING POPULER
                  </div>
                )}
                <h3 style={{ fontSize: "1.75rem", marginBottom: "8px" }}>PDF ≤ {pkg.maxFileSizeMb} MB</h3>
                <p style={{ color: featured ? "rgba(255,255,255,0.7)" : "var(--text-muted)", fontSize: "15px", marginBottom: "24px" }}>
                  {pkg.maxFileSizeMb <= 3
                    ? "Ideal untuk esai, resume, dan tugas singkat."
                    : pkg.maxFileSizeMb <= 5
                      ? "Pas untuk makalah kuliah, artikel, dan proposal ringkas."
                      : "Pilihan terbaik untuk skripsi, jurnal, dan dokumen yang lebih panjang."}
                </p>
                <div style={{ fontSize: "3.5rem", fontWeight: 900, marginBottom: "32px", color: featured ? "white" : "var(--primary)" }}>
                  {formatRupiah(pkg.price)}
                </div>
                <ul style={{ textAlign: "left", listStyle: "none", margin: "0 0 32px 0", padding: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
                  {[
                    "Pemeriksaan otomatis berdasarkan ukuran file",
                    "Ringkasan hasil dan status proses real-time",
                    "Pembayaran QRIS praktis",
                    "Dokumen dibersihkan otomatis setelah proses selesai"
                  ].map((feature) => (
                    <li key={feature} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "15px" }}>
                      <span style={{ color: featured ? "#10b981" : "var(--primary)", fontSize: "20px" }}>✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
