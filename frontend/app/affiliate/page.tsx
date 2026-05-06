import type { Metadata } from "next";
import Link from "next/link";
import AffiliatePageShell from "../../components/affiliate/page-shell";

export const metadata: Metadata = {
  title: "Program Affiliate",
  description: "Daftar sebagai affiliate Verscan, dapatkan voucher diskon 5%, dan pantau komisi Anda dari dashboard khusus."
};

const benefits = [
  {
    title: "Voucher Otomatis",
    desc: "Voucher affiliate otomatis memberi diskon 5% ke customer.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5h-2a2 2 0 0 1-2-2V2H9v1a2 2 0 0 1-2 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M12 17v-6"/><path d="M9 14l3-3 3 3"/></svg>
    )
  },
  {
    title: "Komisi Instan",
    desc: "Setiap order lunas dari voucher Anda menghasilkan komisi Rp1.000.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    )
  },
  {
    title: "Dashboard Realtime",
    desc: "Pantau pesanan, komisi, rekening, dan withdraw dari satu dashboard.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
    )
  }
];

const steps = [
  "Daftar affiliate dan dapatkan voucher otomatis.",
  "Bagikan kode voucher ke customer Anda.",
  "Pantau order dan komisi dari dashboard."
];

export default function AffiliateLandingPage() {
  return (
    <AffiliatePageShell
      eyebrow="PROGRAM AFFILIATE"
    >
      <div className="hero-grid animate-fade-up">
        {/* Left Side: Info */}
        <section>
          <h1 className="text-gradient" style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", lineHeight: 1.1, marginBottom: "24px" }}>
            Bagikan Voucher, <br />
            Kumpulkan Komisi.
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "18px", lineHeight: 1.8, marginBottom: "32px", maxWidth: "580px" }}>
            Jadilah partner kami dan dapatkan penghasilan tambahan dengan cara yang paling mudah. Setiap penggunaan voucher Anda memberikan keuntungan bagi customer dan komisi untuk Anda.
          </p>

          <div className="affiliate-hero-actions" style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "48px" }}>
            <Link href="/affiliate/register" className="button button-primary">
              Mulai Sekarang
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <Link href="/affiliate/login" className="button button-outline">
              Login Dashboard
            </Link>
          </div>

          <div className="feature-bento" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px" }}>
            {[
              { label: "Diskon", value: "5%" },
              { label: "Komisi", value: "Rp1.000" },
              { label: "Status", value: "Realtime" }
            ].map((item, idx) => (
              <div key={item.label} className="glass" style={{ padding: "20px", borderRadius: "24px", textAlign: "center", animationDelay: `${idx * 0.1}s` }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>{item.label}</div>
                <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--text-main)" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Side: Visual */}
        <div className="hero-visual" style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "500px" }}>
            <img 
              src="/affiliate_dashboard_illustration_1776606492347.png" 
              alt="Affiliate Illustration" 
              style={{ width: "100%", height: "auto", borderRadius: "40px", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            />
            <div className="blob" style={{ top: "50%", left: "50%", width: "120%", height: "120%", opacity: 0.15 }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: "120px" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }} className="reveal reveal-up reveal-visible">
          <h2 style={{ fontSize: "36px", fontWeight: 900, marginBottom: "16px" }}>Kenapa Bergabung?</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "600px", margin: "0 auto" }}>
            Kami memberikan fasilitas terbaik untuk mendukung kesuksesan program affiliate Anda.
          </p>
        </div>

        <div className="feature-bento">
          {benefits.map((benefit, idx) => (
            <div key={benefit.title} className="glass feature-card animate-fade-up" style={{ animationDelay: `${idx * 0.15}s`, opacity: 1 }}>
              <div style={{ 
                width: "56px", 
                height: "56px", 
                borderRadius: "16px", 
                background: "linear-gradient(135deg, var(--primary), var(--accent))", 
                color: "white", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                marginBottom: "24px",
                boxShadow: "0 8px 16px rgba(99, 102, 241, 0.2)"
              }}>
                {benefit.icon}
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>{benefit.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7 }}>{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel affiliate-steps-panel" style={{ marginTop: "100px", background: "var(--bg-dark)", color: "white", overflow: "hidden", position: "relative" }}>
        <div className="blob" style={{ top: "-20%", right: "-10%", width: "400px", height: "400px", opacity: 0.1 }} />
        
        <div className="zigzag-item" style={{ gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
          <div className="affiliate-steps-copy" style={{ position: "relative", zIndex: 1 }}>
            <h2 className="affiliate-steps-title" style={{ fontSize: "32px", fontWeight: 900, marginBottom: "32px" }}>Langkah Mudah Memulai</h2>
            <div className="affiliate-steps-list" style={{ display: "grid", gap: "24px" }}>
              {steps.map((step, index) => (
                <div key={step} className="affiliate-step-item" style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
                  <div className="affiliate-step-number" style={{ 
                    width: "40px", 
                    height: "40px", 
                    borderRadius: "12px", 
                    background: "rgba(255,255,255,0.1)", 
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontWeight: 800, 
                    flexShrink: 0 
                  }}>
                    {index + 1}
                  </div>
                  <div className="affiliate-step-text" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontSize: "16px", paddingTop: "8px" }}>{step}</div>
                </div>
              ))}
            </div>
            
            <div className="affiliate-steps-action" style={{ marginTop: "40px" }}>
              <Link href="/affiliate/register" className="button button-primary" style={{ padding: "14px 28px" }}>
                Daftar Sekarang
              </Link>
            </div>
          </div>

          <div className="glass affiliate-earning-card" style={{ padding: "40px", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
            <div className="affiliate-earning-head" style={{ textAlign: "center", marginBottom: "32px" }}>
              <div className="affiliate-earning-eyebrow" style={{ fontSize: "14px", color: "var(--primary-light)", fontWeight: 800, marginBottom: "8px", letterSpacing: "1px" }}>ESTIMASI PENGHASILAN</div>
              <div className="affiliate-earning-value" style={{ fontSize: "48px", fontWeight: 900 }}>Rp1.000.000+</div>
              <p className="affiliate-earning-subtitle" style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Potensi per bulan dengan 1000 order sukses</p>
            </div>
            <div className="affiliate-earning-list" style={{ display: "grid", gap: "12px" }}>
              {[
                { label: "Voucher Diskon", val: "5% OFF" },
                { label: "Pencairan Dana", val: "Min Rp50.000" },
                { label: "Metode Bayar", val: "Transfer Bank / E-Wallet" }
              ].map(row => (
                <div key={row.label} className="affiliate-earning-row" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span className="affiliate-earning-label" style={{ color: "rgba(255,255,255,0.5)" }}>{row.label}</span>
                  <span className="affiliate-earning-row-value" style={{ fontWeight: 700 }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 968px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .hero-grid section {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hero-visual {
            order: -1;
            margin-bottom: 40px;
          }
          .zigzag-item {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }

        @media (max-width: 640px) {
          .affiliate-hero-actions {
            width: 100%;
            gap: 12px !important;
            margin-bottom: 36px !important;
            justify-content: center;
          }

          .affiliate-hero-actions .button {
            flex: 1 1 0;
            min-width: 0;
            padding: 14px 18px;
            font-size: 15px;
            gap: 8px;
            min-height: 52px;
          }

          .affiliate-hero-actions .button svg {
            width: 18px;
            height: 18px;
          }

          .affiliate-steps-panel {
            margin-top: 72px !important;
            padding: 24px !important;
            border-radius: 24px !important;
          }

          .affiliate-steps-title {
            font-size: 26px !important;
            margin-bottom: 24px !important;
          }

          .affiliate-steps-list {
            gap: 18px !important;
          }

          .affiliate-step-item {
            gap: 14px !important;
          }

          .affiliate-step-number {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
            font-size: 18px;
          }

          .affiliate-step-text {
            font-size: 15px !important;
            line-height: 1.6 !important;
            padding-top: 4px !important;
          }

          .affiliate-steps-action {
            margin-top: 28px !important;
          }

          .affiliate-earning-card {
            padding: 26px 22px !important;
            border-radius: 24px !important;
          }

          .affiliate-earning-head {
            margin-bottom: 24px !important;
          }

          .affiliate-earning-eyebrow {
            font-size: 12px !important;
          }

          .affiliate-earning-value {
            font-size: 34px !important;
            line-height: 1.1 !important;
          }

          .affiliate-earning-subtitle {
            font-size: 13px !important;
            line-height: 1.6 !important;
          }

          .affiliate-earning-list {
            gap: 8px !important;
          }

          .affiliate-earning-row {
            padding: 10px 0 !important;
            gap: 12px !important;
          }

          .affiliate-earning-label,
          .affiliate-earning-row-value {
            font-size: 14px !important;
          }
        }

        @media (max-width: 480px) {
          .affiliate-hero-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .affiliate-hero-actions .button {
            width: 100%;
            padding: 13px 16px;
            font-size: 14px;
            min-height: 48px;
          }

          .affiliate-steps-panel {
            padding: 20px !important;
            border-radius: 20px !important;
          }

          .affiliate-steps-title {
            font-size: 22px !important;
          }

          .affiliate-step-number {
            width: 30px !important;
            height: 30px !important;
            font-size: 16px;
          }

          .affiliate-step-text {
            font-size: 14px !important;
          }

          .affiliate-earning-card {
            padding: 22px 18px !important;
            border-radius: 20px !important;
          }

          .affiliate-earning-value {
            font-size: 28px !important;
          }

          .affiliate-earning-row {
            flex-direction: column;
            align-items: flex-start !important;
          }

          .affiliate-earning-row-value {
            font-size: 15px !important;
          }
        }
      `}</style>
    </AffiliatePageShell>
  );
}
