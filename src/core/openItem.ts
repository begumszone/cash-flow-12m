/**
 * Çekirdek `open_item` tipinin, Borç Takip Raporu adaptörünün ürettiği alt
 * kümesi. Tam şema docs/veri-modeli-v1.md bölüm 3.2'de; burada v1 adaptörünün
 * gerçekten doldurabildiği alanlar var. Kur alanları yok, çünkü bu rapor
 * tümüyle TL (dövizli tutar tüm satırlarda 0 geldi).
 */

export type Direction = 'in' | 'out';

/**
 * Vade kalitesi. `suspect`, Logo'nun ödeme planı bağlı değilken vadeyi fatura
 * tarihine eşitlemesi durumudur (3.2'deki kritik kural): eksik veri, geçerli
 * veri gibi görünür — o yüzden ayrı işaretlenir, sessizce kullanılmaz.
 */
export type DueDateQuality = 'reliable' | 'suspect' | 'missing';

export interface OpenItem {
  party_code: string;
  party_name: string;
  direction: Direction;
  /** Ham İşlem Türü (ör. "Perakende Satış Faturası"). */
  doc_type: string;
  doc_no: string;
  /** ISO "YYYY-MM-DD" ya da null. */
  doc_date: string | null;
  due_date: string | null;
  due_date_quality: DueDateQuality;
  /** Belgenin postalanmış (Borç ya da Alacak) tutarı, pozitif. */
  amount_original: number;
  /** Bu belgeye eşleşen Kapanan Tutar toplamı. */
  closed_amount: number;
  /** amount_original - closed_amount; yalnızca > 0 olanlar açık kalemdir. */
  open_amount: number;
}
