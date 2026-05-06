const testimonials = [
  {
    quote: "Ngebantu banget buat ngecek draft skripsi sebelum disubmit ke kampus. Prosesnya cepet, hasilnya akurat persis Turnitin asli. Jadi lebih pede pas bimbingan.",
    author: "Budi Satrio",
    role: "Mahasiswa Akhir"
  },
  {
    quote: "Sangat praktis untuk ngecek tugas mahasiswa. Gak perlu langganan bulanan yang mahal, cukup bayar pas butuh aja. Laporannya juga sangat detail.",
    author: "Dr. Elena",
    role: "Dosen"
  },
  {
    quote: "Buat saya yang sering nulis artikel, tool ini kepake banget. Gampang dipake dan yang paling penting privasi aman karena file langsung otomatis dihapus.",
    author: "Rizky Firmansyah",
    role: "Penulis Lepas"
  }
];

export default function Testimonials() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 className="section-title reveal reveal-up" style={{ fontSize: '2.5rem', fontWeight: 900 }}>Review dari Pengguna Kami</h2>
          <div className="reveal reveal-up" style={{ width: '80px', height: '4px', background: 'var(--primary)', margin: '16px auto', borderRadius: '2px' }}></div>
        </div>
        <div className="feature-bento">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="glass glass-panel reveal reveal-scale" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ color: 'var(--accent)', fontSize: '24px', marginBottom: '16px', opacity: 0.8 }}>"</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, color: 'var(--text-main)' }}>{testimonial.quote}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px' }}>
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "16px" }}>{testimonial.author}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

