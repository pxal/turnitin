"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import Navbar from "./navbar";
import { useBranding } from "../lib/hooks/useBranding";

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const branding = useBranding();
  const isAdmin = pathname?.startsWith("/admin");
  const isAffiliateDashboard = pathname?.startsWith("/affiliate/dashboard");
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState("");

  useEffect(() => {
    setMounted(true);
    setCurrentYear(String(new Date().getFullYear()));
  }, []);

  if (isAdmin || isAffiliateDashboard) {
    return <>{children}</>;
  }

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <footer style={{ backgroundColor: 'var(--bg-main)', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        {/* Top Call to Action Bar */}
        <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '48px 0' }}>
          <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.5px' }}>Butuh panduan lebih lanjut?</h3>
              <p style={{ opacity: 0.9, fontSize: '16px' }}>Tim spesialis kami online 24/7 untuk menjawab pertanyaan Anda.</p>
            </div>
            <a href={branding.whatsappUrl || "https://wa.me/6282135489547"} target="_blank" rel="noreferrer" style={{ backgroundColor: 'white', color: 'var(--primary)', padding: '16px 36px', borderRadius: '999px', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              Tanya via WhatsApp
            </a>
          </div>
        </div>

        <div className="container" style={{ padding: '80px 0 40px' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '64px', marginBottom: '64px' }}>
            
            {/* Brand Column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '30px', fontWeight: 900, marginBottom: '24px', color: 'var(--primary)' }}>
                {branding.logoUrl ? <img src={branding.logoUrl} alt={branding.brandName} style={{ width: "104px", height: "104px", objectFit: "contain", flexShrink: 0, marginRight: "-10px" }} /> : null}
                {branding.brandName}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1.8, marginBottom: '32px', maxWidth: '400px' }}>
                Solusi pemeriksaan keaslian dokumen berbasis Turnitin, dengan hasil yang jelas dan dapat diandalkan.
              </p>
            </div>

            {/* Social Column */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '24px', color: 'var(--text-main)', letterSpacing: '1px' }}>IKUTI KAMI</h4>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <a href={branding.instagramUrl || "#"} target={branding.instagramUrl ? "_blank" : undefined} rel={branding.instagramUrl ? "noreferrer" : undefined} aria-label="Instagram" style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)', pointerEvents: branding.instagramUrl ? "auto" : "none", opacity: branding.instagramUrl ? 1 : 0.45 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a href={branding.tiktokUrl || "#"} target={branding.tiktokUrl ? "_blank" : undefined} rel={branding.tiktokUrl ? "noreferrer" : undefined} aria-label="TikTok" style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)', pointerEvents: branding.tiktokUrl ? "auto" : "none", opacity: branding.tiktokUrl ? 1 : 0.45 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                </a>
                <a href={branding.whatsappUrl || "https://wa.me/6282135489547"} target="_blank" rel="noreferrer" aria-label="WhatsApp" style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </a>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.8, marginTop: '20px', maxWidth: '320px' }}>
                Terhubung dengan {branding.brandName} lewat WhatsApp untuk update layanan terbaru.
              </p>
            </div>

          </div>
          
          <div className="footer-bottom" style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            <div>&copy; {currentYear} {branding.brandName}. Seluruh Hak Cipta Dilindungi.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              Dibuat dengan <span style={{ color: 'var(--accent)' }}>❤️</span> di Indonesia
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
