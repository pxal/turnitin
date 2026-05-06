"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl, formatRupiah } from "../lib/api";

type PackageItem = {
  id: string;
  name: string;
  maxFileSizeMb: number;
  price: number;
};

export default function PackageSidebar() {
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
        console.error("Failed to load package sidebar:", error);
      }
    }

    void loadPackages();
  }, []);

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "20px",
      border: "1px solid var(--border)", padding: "28px", overflow: "hidden"
    }}>
      <h3 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "20px", color: "var(--text-main)", letterSpacing: "0.5px" }}>
        TARIF OTOMATIS
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {packages.map((item, index) => {
          const isPopular = index === packages.length - 1;

          return (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 16px", borderRadius: "12px",
              background: isPopular ? "rgba(11,79,217,0.08)" : "var(--bg-alt)",
              border: isPopular ? "1px solid rgba(11,79,217,0.25)" : "1px solid transparent",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>{index === 0 ? "📄" : index === 1 ? "📋" : "📚"}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-main)" }}>
                    PDF ≤ {item.maxFileSizeMb} MB
                  </div>
                  {isPopular && (
                    <div style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 700 }}>PALING POPULER</div>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: "15px", color: isPopular ? "var(--primary)" : "var(--text-main)" }}>
                {formatRupiah(item.price)}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "16px", lineHeight: 1.6 }}>
        * Harga ditentukan otomatis berdasarkan ukuran file PDF yang Anda unggah. Maksimal ukuran file mengikuti paket aktif di dashboard admin.
      </p>
    </div>
  );
}
