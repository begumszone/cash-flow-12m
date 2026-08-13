import type { Direction } from '../../core/openItem';

/**
 * Logo Borç Takip Raporu'ndaki "İşlem Türü" değerlerinin sınıflandırması.
 *
 * Rapor bir kapama/eşleştirme dökümü: her satır ya bir belge postalaması
 * (fatura), ya bir nakit/kapama hareketi (tahsilat, havale, virman), ya da
 * bir düzeltmedir (dekont). Yalnızca FATURA türleri açık kalem adayıdır;
 * nakit hareketleri başka kalemleri kapatır, kendileri açık borç değildir.
 *
 * `direction`: faturanın nakit yönü — satış bize para GİRİŞİ (müşteri öder),
 * satınalma/alınan hizmet ÇIKIŞ (biz öderiz). İade faturaları ilgili yönü
 * ters çevirir (sign: -1).
 */
export type IslemKind = 'invoice' | 'cash' | 'adjustment' | 'opening' | 'unknown';

export interface IslemClass {
  kind: IslemKind;
  /** invoice türleri için nakit yönü; diğerlerinde null. */
  direction: Direction | null;
  /** İade faturalarında -1, normalde +1. */
  sign: 1 | -1;
}

const INVOICE_IN = new Set<string>([
  'Perakende Satış Faturası',
  'Toptan Satış Faturası',
  'Verilen Hizmet Faturası',
]);

const INVOICE_IN_RETURN = new Set<string>([
  'Perakende Satış İade Faturası',
  'Toptan Satış İade Faturası',
]);

const INVOICE_OUT = new Set<string>([
  'Satınalma Faturası',
  'Alınan Hizmet Faturası',
  'Alınan Serbest Meslek Makbuzu',
]);

const INVOICE_OUT_RETURN = new Set<string>(['Satınalma İade Faturası']);

/**
 * Nakit / kapama hareketleri: başka kalemleri kapatır, kendileri açık kalem
 * değildir. Uygulanmamış (kapama yapmayan) bir tahsilat "avans/mahsupsuz
 * nakit"tir — açık kalem değil ama veri kalitesi panelinde ayrıca sayılır.
 */
const CASH = new Set<string>([
  'Nakit Tahsilat',
  'Nakit Ödeme',
  'CH Tahsilat',
  'CH Ödeme',
  'Virman İşlemi',
  'Gelen Havale/EFT',
  'Gönderilen Havale/EFT',
  'Kredi Kartı Fişi',
  'Firma Kredi Kartı Fişi',
  'Kredi Kartı İade Fişi',
  'Kendi Çekimiz',
]);

/** Borç/Alacak dekontları: elle düzeltmeler; yönü tek başına belirsiz. */
const ADJUSTMENT = new Set<string>(['Borç Dekontu', 'Alacak Dekontu']);

export function classifyIslemTuru(raw: string | null | undefined): IslemClass {
  const t = (raw ?? '').trim();
  if (INVOICE_IN.has(t)) return { kind: 'invoice', direction: 'in', sign: 1 };
  if (INVOICE_IN_RETURN.has(t)) return { kind: 'invoice', direction: 'in', sign: -1 };
  if (INVOICE_OUT.has(t)) return { kind: 'invoice', direction: 'out', sign: 1 };
  if (INVOICE_OUT_RETURN.has(t)) return { kind: 'invoice', direction: 'out', sign: -1 };
  if (CASH.has(t)) return { kind: 'cash', direction: null, sign: 1 };
  if (ADJUSTMENT.has(t)) return { kind: 'adjustment', direction: null, sign: 1 };
  if (t === 'Açılış İşlemi') return { kind: 'opening', direction: null, sign: 1 };
  return { kind: 'unknown', direction: null, sign: 1 };
}
