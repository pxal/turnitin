export default function HowItWorks() {
  const steps = [
    { number: "1", title: "Login Cepat", desc: "Masuk ke dashboard langsung dengan akun Google, tanpa ribet isi form." },
    { number: "2", title: "Unggah Dokumen", desc: "Upload file PDF Anda, sistem akan otomatis mulai memeriksa." },
    { number: "3", title: "Lakukan Pembayaran", desc: "Selesaikan pembayaran dengan mudah dengan scan Qris." },
    { number: "4", title: "Unduh Laporan", desc: "Laporan hasil cek langsung tersedia dan siap diunduh." }
  ];

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 className="section-title reveal reveal-up" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Kenapa Harus Verscan</h2>
          <div className="reveal reveal-up" style={{ width: '80px', height: '4px', background: 'var(--primary)', margin: '16px auto', borderRadius: '2px' }}></div>
        </div>
        <div className="zigzag-timeline">
          {steps.map((step, index) => (
            <div key={step.number} className="zigzag-item reveal reveal-up">
              <div style={{ position: 'relative' }}>
                <div className="step-number">{step.number}</div>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '16px', color: 'var(--primary)' }}>{step.title}</h3>
                <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>{step.desc}</p>
              </div>
              <div className="glass glass-panel" style={{ padding: '32px', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
                <div style={{ fontSize: '64px', opacity: 0.8 }}>
                  {index === 0 ? '🔐' : index === 1 ? '📄' : index === 2 ? '📱' : '🎯'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

