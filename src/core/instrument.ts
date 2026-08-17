/**
 * Çek/senet portföyü (docs 3.3). Batı şablonlarında karşılığı yok: çek yalnızca
 * bir alacak değil, ciro edilebildiği için aynı zamanda bir ödeme aracı. Bu
 * yüzden durum (status) nakit akışını doğrudan belirler.
 */

export type InstrumentType = 'cheque' | 'promissory_note';
/** received = müşteri çeki (elimizde), issued = kendi çekimiz (dışarıda). */
export type InstrumentDirection = 'received' | 'issued';

export type InstrumentStatus =
  | 'portfolio' // portföyde
  | 'at_bank_collection' // bankada tahsilde
  | 'at_bank_collateral' // bankada teminatta — nakit değil
  | 'endorsed' // ciro edildi — ne giriş ne çıkış
  | 'cleared' // tahsil edildi — geçmiş
  | 'bounced' // karşılıksız
  | 'cancelled'; // iptal

export interface Instrument {
  instrument_type: InstrumentType;
  direction: InstrumentDirection;
  party_code: string;
  party_name: string;
  drawer_name: string;
  bank_name: string;
  due_date: string | null;
  amount: number;
  status: InstrumentStatus;
}
