/**
 * Gelir/gider kategorileri — nakit akışında "ödenecek şey vergi mi, maaş mı,
 * stoğa mı?" sorusunun cevabı. Klasik nakit akış projeksiyonu taksonomisinden
 * (SBA monthly cash flow) Türk KOBİ gerçeğine uyarlandı. Her kategori bir yöne
 * (giriş/çıkış) ve bir faaliyet grubuna (işletme/yatırım/finansman) bağlı.
 *
 * Kategori kaynağı: ideali Logo'daki masraf merkezi + proje kodu (bkz. docs 3.2
 * — cost_center/project_code). Bunlar export'ta yoksa cari bazında elle atanır;
 * varsayılan İşlem Türü'nden tahmin edilir.
 */

export type CashCategory =
  // gelir (giriş)
  | 'tahsilat'
  | 'finansman_giris'
  | 'diger_gelir'
  // gider (çıkış)
  | 'stok'
  | 'maas'
  | 'sgk'
  | 'vergi'
  | 'kira'
  | 'enerji'
  | 'nakliye'
  | 'hizmet'
  | 'bakim'
  | 'kredi'
  | 'yatirim'
  | 'diger_gider';

export type ActivityGroup = 'operating' | 'investing' | 'financing';

export interface CategoryMeta {
  key: CashCategory;
  label: string;
  direction: 'in' | 'out';
  group: ActivityGroup;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'tahsilat', label: 'Satış Tahsilatı', direction: 'in', group: 'operating' },
  { key: 'finansman_giris', label: 'Kredi / Sermaye', direction: 'in', group: 'financing' },
  { key: 'diger_gelir', label: 'Diğer Gelir', direction: 'in', group: 'operating' },
  { key: 'stok', label: 'Mal / Stok Alımı', direction: 'out', group: 'operating' },
  { key: 'maas', label: 'Personel Maaş', direction: 'out', group: 'operating' },
  { key: 'sgk', label: 'SGK / Bordro', direction: 'out', group: 'operating' },
  { key: 'vergi', label: 'Vergi', direction: 'out', group: 'operating' },
  { key: 'kira', label: 'Kira', direction: 'out', group: 'operating' },
  { key: 'enerji', label: 'Enerji / Faturalar', direction: 'out', group: 'operating' },
  { key: 'nakliye', label: 'Nakliye / Lojistik', direction: 'out', group: 'operating' },
  { key: 'hizmet', label: 'Dış Hizmet / Danışmanlık', direction: 'out', group: 'operating' },
  { key: 'bakim', label: 'Bakım / Onarım', direction: 'out', group: 'operating' },
  { key: 'kredi', label: 'Kredi Ödemesi', direction: 'out', group: 'financing' },
  { key: 'yatirim', label: 'Yatırım / Demirbaş', direction: 'out', group: 'investing' },
  { key: 'diger_gider', label: 'Diğer Gider', direction: 'out', group: 'operating' },
];

const META = new Map<CashCategory, CategoryMeta>(CATEGORIES.map((c) => [c.key, c]));

export function categoryLabel(key: CashCategory): string {
  return META.get(key)?.label ?? key;
}

export function categoriesFor(direction: 'in' | 'out'): CategoryMeta[] {
  return CATEGORIES.filter((c) => c.direction === direction);
}

/**
 * Bir kalemin varsayılan kategorisi: önce cari bazında elle atama (override),
 * yoksa İşlem Türü'nden zayıf bir tahmin. Kesin sınıflandırma için masraf
 * merkezi/proje kodu ya da elle atama gerekir.
 */
export function categoryFor(
  direction: 'in' | 'out',
  docType: string,
  partyCode: string,
  overrides: Map<string, CashCategory>,
): CashCategory {
  const manual = overrides.get(partyCode);
  if (manual) return manual;
  if (direction === 'in') return 'tahsilat';
  const t = docType.toLocaleLowerCase('tr');
  if (t.includes('hizmet')) return 'hizmet';
  if (t.includes('satınalma') || t.includes('satinalma')) return 'stok';
  return 'diger_gider';
}
