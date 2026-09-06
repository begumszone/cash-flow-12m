/**
 * "Nasıl çalışır", beklenen Excel formatı ve Sıkça Sorulan Sorular. Hem giriş
 * ekranında (yükleme öncesi) hem de header'daki butondan modal olarak gösterilir
 * — kullanıcı sisteme neyi, hangi formatta yükleyeceğini baştan anlasın diye.
 */

const BORC_COLS = [
  ['Cari Hesap', '"kod / ad" (ör. 120.01.045 / Örnek Ticaret Ltd.)'],
  ['Vade T.', 'Kalemin vade tarihi'],
  ['İşlem T.', 'Fatura/işlem tarihi'],
  ['Belge No.', 'Fiş/fatura numarası'],
  ['İşlem Türü', 'Satış / Satınalma / Hizmet / Tahsilat…'],
  ['Borç', 'Borç tutarı'],
  ['Alacak', 'Alacak tutarı'],
  ['Kapanan Tutar', 'Kapanan (ödenmiş) kısım'],
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Verilerim güvende mi? Bir yere yükleniyor mu?',
    a: 'Hayır. Tüm hesaplama senin tarayıcında yapılır; dosyalar hiçbir sunucuya gönderilmez, hiçbir yerde saklanmaz.',
  },
  {
    q: 'Hangi raporu yüklemeliyim?',
    a: (
      <>
        Logo'da <strong>Finans → Ödeme/Tahsilat Raporları → Borç Takip Raporu</strong> → Excel
        (<strong>.xlsx</strong>) olarak dışa aktar. İstersen ayrıca <strong>Çek/Senet Raporları</strong>'nı
        da ekleyebilirsin.
      </>
    ),
  },
  {
    q: 'Neden .xls değil de .xlsx?',
    a: 'Eski .xls formatı 65.536 satırda sessizce kesilir; büyük dosyalarda veri kaybolur. .xlsx bu sorunu yaşamaz.',
  },
  {
    q: 'Excel dosyasını düzenlemem, kolonları taşımam gerekiyor mu?',
    a: 'Hayır. Logo\'nun standart Borç Takip Raporu düzenini olduğu gibi bırak — araç kolonları kendisi tanır. Sadece .xlsx olarak dışa aktarman yeterli.',
  },
  {
    q: 'Açık kalemlerim eksik/az görünüyor.',
    a: 'Raporu bir tarih aralığıyla filtreleyerek almış olabilirsin. Tüm açık borç/alacakları görmek için raporu filtresiz ya da "kapanmamış (açık) kalemler" seçeneğiyle al.',
  },
  {
    q: '"Şüpheli vade" ne demek?',
    a: 'Logo, ödeme planı tanımlı değilse vadeyi fatura tarihine eşitler — bu vade güvenilmezdir. Araç bunları işaretler ve senin girdiğin cari vadesinden gerçek vadeyi türetir.',
  },
  {
    q: 'Çek/senet yüklersem ne değişir?',
    a: 'Portföydeki müşteri çekleri tahsilata (giriş), kendi çeklerin ödemeye (çıkış) eklenir. Teminattaki, ciro edilen ve karşılıksız çekler nakit sayılmaz.',
  },
  {
    q: 'Açılış nakdi nedir?',
    a: 'Projeksiyonun başladığı gün elindeki para: bir önceki gece kapanışındaki kasa + banka bakiyelerinin toplamı. Bloke/teminattaki hesapları işaretlersen toplama katılmaz.',
  },
  {
    q: 'Senaryolar (Kötümser / Baz / İyimser) ne işe yarar?',
    a: 'Tahsilatın ne zaman geleceğine dair üç varsayım: Kötümser\'de tahsilat gecikmeli ve belirsiz vadeliler hariç, İyimser\'de vadesinde ve hepsi dahil.',
  },
  {
    q: 'Sonucu paylaşabilir miyim?',
    a: '"Excel\'e Aktar" ile projeksiyonu, tahsilatları ve ödemeleri CSV olarak indirip ekibinle paylaşabilirsin.',
  },
];

export function HelpFaq() {
  return (
    <div className="help">
      <section className="help__block">
        <h3>Nasıl çalışır?</h3>
        <ol className="help__steps">
          <li>
            Logo'da <strong>Finans → Ödeme/Tahsilat Raporları → Borç Takip Raporu</strong>'nu
            <strong> .xlsx</strong> olarak dışa aktar. <em>(Tüm açık kalemler gelsin diye filtresiz
            ya da "kapanmamış kalemler" seçeneğiyle al.)</em>
          </li>
          <li>Dosyayı yükleme alanına sürükle — açık kalemler ve veri kalitesi anında çıkar.</li>
          <li>
            <strong>Açılış nakdini</strong> (kasa + banka) gir.
          </li>
          <li>Vadesi belirsiz cariler için <strong>cari vadesi</strong> gir; projeksiyon canlı güncellenir.</li>
          <li>
            <em>(İsteğe bağlı)</em> <strong>Çek/Senet Raporu</strong>'nu da ekleyip çekleri projeksiyona kat.
          </li>
        </ol>
      </section>

      <section className="help__block">
        <h3>Beklenen Excel formatı</h3>
        <p className="help__p">
          Borç Takip Raporu'nda satır 1 rapor başlığı, satır 2 kolon başlıkları, satır 3'ten
          itibaren veridir. Araç şu kolonları kullanır:
        </p>
        <div className="table-wrap">
          <table className="help__table">
            <thead>
              <tr>
                <th>Kolon</th>
                <th>İçerik</th>
              </tr>
            </thead>
            <tbody>
              {BORC_COLS.map(([col, desc]) => (
                <tr key={col}>
                  <td>
                    <span className="mono">{col}</span>
                  </td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="help__p help__p--muted">
          Çek/Senet Raporu için kullanılan kolonlar: Kıymet Türü, Cins (Müşteri Çeki / Kendi
          Çekimiz), Cari Hesap, Vade T., Tutar, Durumu.
        </p>
      </section>

      <section className="help__block">
        <h3>Sıkça Sorulan Sorular</h3>
        <div className="faq">
          {FAQ.map((item, i) => (
            <details key={i} className="faq__item">
              <summary className="faq__q">{item.q}</summary>
              <div className="faq__a">{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
