# cash-flow-13w

13 haftalık rolling nakit akışı projeksiyon aracı — Türkiye'deki KOBİ'ler için
haftalık likidite planlama. **Tamamen tarayıcıda çalışır; veri hiçbir sunucuya
gönderilmez.**

Logo Tiger 3 "Borç Takip Raporu" (.xlsx) export'unu yükleyin; araç açık kalemleri
türetir, veri kalitesindeki boşlukları rakamla gösterir, cari bazında vade girmenize
izin verir ve 13 haftalık nakit projeksiyonunu (grafik + tablo, üç senaryo) çıkarır.

## Çalıştırma

```bash
npm install
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi
npm test           # birim testler (28 test)
```

Bir export'un veri kalitesini komut satırından görmek için (arayüz açmadan):

```bash
npm run inspect:report -- /yol/borc-takip.xlsx
```

## Nasıl çalışır

1. Logo'da **Finans → Ödeme/Tahsilat Raporları → Borç Takip Raporu**'nu `.xlsx`
   olarak alın (`.xls` değil — eski format 65.536 satırda kesilir).
2. Dosyayı uygulamaya bırakın. Açık kalemler ve veri kalitesi anında çıkar.
3. Vadesi Logo'da tanımsız cariler için cari vadesini girin — projeksiyon canlı güncellenir.

## Mimari

- **Adaptör katmanı** (`src/adapters/logo`) — kaynağa özgü; Borç Takip export'unu
  çekirdek `open_item` kalemlerine çevirir. Kolon eşlemesi `docs/veri-modeli-v1.md`
  bölüm 6.1'de.
- **Türetme katmanı** (`src/derive`) — etkin vade (4.1): ERP vadesi kullanılamadığında
  cari bazında ödeme vadesinden türetir.
- **Projeksiyon motoru** (`src/projection`) — haftalık kovalama (4.4), üç senaryo.
- **Veri kalitesi** (`src/quality`) — eksik veriyi gizlemez, ölçer (5. bölüm).

Çekirdek mantık saf TypeScript ve testlidir; arayüz (React + Vite + Recharts) bunun
üzerinde ince bir katmandır.

## Durum

Çekirdek boru hattı çalışır: Borç Takip → açık kalem → türetilmiş vade → 13 haftalık
projeksiyon + veri kalitesi paneli. Sıradaki kaynaklar: çek/senet (`instrument`) ve
banka/kasa (`bank_balance`) raporları — tasarımı `docs/veri-modeli-v1.md` bölüm 8'de.

Tasarım ve v1 kapsam kararları için: [`docs/veri-modeli-v1.md`](docs/veri-modeli-v1.md).
