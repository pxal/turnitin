const features = [
  {
    icon: "🔍",
    title: "Database Turnitin Resmi",
    desc: "Pengecekan dilakukan menggunakan database Turnitin yang umum dipakai oleh institusi, sehingga hasilnya lebih akurat dan dapat diandalkan."
  },
  {
    icon: "⚡",
    title: "Proses Cepat",
    desc: "Dokumen diproses secara otomatis dengan waktu tunggu yang singkat tanpa perlu proses manual."
  },
  {
    icon: "🔒",
    title: "Privasi Terjaga",
    desc: "Dokumen Anda diproses dengan aman tanpa penyimpanan permanen."
  }
];

export default function Features() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 className="section-title animate-fade-up delay-1" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Privasi dan Akurasi dalam Satu Platform</h2>
          <div className="animate-fade-up delay-1" style={{ width: '80px', height: '4px', background: 'var(--primary)', margin: '16px auto', borderRadius: '2px' }}></div>
        </div>
        <div className="feature-bento">
          {features.map((feature, index) => (
            <div key={feature.title} className={`feature-card glass animate-scale-up delay-${index + 1}`} style={{ transition: 'all 0.4s ease' }}>
              <div style={{ fontSize: '48px', marginBottom: '24px' }}>
                {feature.icon}
              </div>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', marginBottom: '16px' }}>{feature.title}</h3>
              <p className="feature-desc" style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

