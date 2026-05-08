const faqs = [
  {
    question: "Apa itu cek plagiat online?",
    answer:
      "Cek plagiat online adalah proses membandingkan dokumen dengan sumber digital untuk melihat potensi kemiripan teks. Layanan ini membantu penulis mengevaluasi naskah sebelum dikumpulkan, dipublikasikan, atau dikirim ke pembimbing."
  },
  {
    question: "Apakah Verscan bisa dipakai untuk cek Turnitin?",
    answer:
      "Verscan menyediakan layanan cek similarity berbasis Turnitin dengan pembayaran sekali pakai, sehingga cocok untuk pengguna yang hanya membutuhkan pengecekan dokumen tertentu tanpa langganan bulanan."
  },
  {
    question: "Dokumen apa saja yang bisa dicek?",
    answer:
      "Layanan ini cocok untuk skripsi, tesis, jurnal, artikel ilmiah, proposal, makalah kuliah, laporan magang, dan dokumen akademik lain dalam format PDF sesuai batas ukuran paket yang dipilih."
  },
  {
    question: "Apakah file saya aman?",
    answer:
      "Dokumen diproses secara privat dan tidak ditampilkan ke pengguna lain. File juga dibersihkan otomatis setelah proses selesai sesuai alur layanan."
  }
];

export { faqs };

export default function SeoContent() {
  return (
    <section className="section seo-section">
      <div className="container seo-grid">
        <div>
          <span className="seo-kicker">Cek Turnitin Online</span>
          <h2 className="section-title reveal reveal-up" style={{ fontSize: '2.5rem', fontWeight: 900 }}>
            Layanan Cek Plagiat Cepat untuk Skripsi, Jurnal, dan Tugas Kuliah
          </h2>
          <p className="seo-copy reveal reveal-up">
            Verscan membantu mahasiswa, dosen, peneliti, dan penulis melakukan cek plagiarisme dokumen dengan proses yang praktis. Anda bisa mengunggah file, memilih paket sesuai ukuran dokumen, menyelesaikan pembayaran QRIS, lalu mengunduh laporan similarity saat proses selesai.
          </p>
          <p className="seo-copy reveal reveal-up">
            Jika Anda mencari cek plagiat, cek Turnitin, cek similarity, atau cek Turnitin murah, halaman ini dirancang untuk menjelaskan layanan secara jelas: apa yang dicek, bagaimana prosesnya, dan kenapa laporan kemiripan penting sebelum naskah dikumpulkan.
          </p>
        </div>

        <div className="seo-panel glass">
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '18px' }}>Cocok untuk</h3>
          <ul className="seo-list">
            <li>Skripsi, tesis, dan disertasi</li>
            <li>Jurnal dan artikel ilmiah</li>
            <li>Makalah, proposal, dan laporan kuliah</li>
            <li>Draft publikasi, konten, dan naskah profesional</li>
          </ul>
        </div>
      </div>

      <div className="container faq-wrap">
        <h2 className="section-title reveal reveal-up" style={{ fontSize: '2.25rem', fontWeight: 900, textAlign: 'center' }}>
          Pertanyaan Seputar Cek Plagiat dan Turnitin
        </h2>
        <div className="faq-grid">
          {faqs.map((faq) => (
            <article key={faq.question} className="faq-card glass reveal reveal-scale">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
