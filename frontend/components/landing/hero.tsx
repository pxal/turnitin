import HeroAction from "./hero-action";

export default function Hero() {
  return (
    <section className="hero-wrapper">
      <div className="blob" style={{ top: '20%', left: '80%' }}></div>
      <div className="blob" style={{ top: '80%', left: '20%', background: 'var(--primary)' }}></div>
      
      <div className="container hero-grid">
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 className="hero-title animate-fade-up delay-1" style={{ fontSize: 'clamp(3rem, 7vw, 4.5rem)', fontWeight: 900 }}>
            Cek Plagiat dan Turnitin Murah untuk Dokumen Akademik
          </h1>
          <p className="hero-desc animate-fade-up delay-2" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '600px' }}>
            Cek plagiarisme online untuk skripsi, jurnal, artikel, proposal, dan tugas kuliah. Proses cepat, laporan similarity jelas, pembayaran mudah, dan file diproses dengan privasi terjaga.
          </p>
          <HeroAction />
        </div>

        <div className="animate-fade-right delay-2">
          <div className="hero-visual animate-float" style={{ animationDelay: '0s', opacity: 1 }}>
            <div className="glass glass-panel" style={{ padding: '40px', position: 'relative', boxShadow: '0 30px 60px -12px rgba(99, 102, 241, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px' }}>
                  📄
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '18px' }}>Skripsi_Final_Rev10.pdf</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Memindai 2.450 halaman web...</div>
                </div>
              </div>
              
              <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ height: '100%', width: '85%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: '4px' }}></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Orisinalitas</div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)' }}>98.2%</div>
                </div>
                <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontWeight: 700 }}>
                  Sangat Baik
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
