import type {
  Instrument,
  InstrumentDirection,
  InstrumentStatus,
  InstrumentType,
} from '../../core/instrument';
import { splitCariHesap } from './borcTakip';

/**
 * Logo "Çek/Senet Raporu" satırı, isimli alanlara çözülmüş. Kolon yapısı
 * doğrulanacak (bkz. docs 8): gerçek Çek/Senet Raporu export'u henüz
 * incelenmedi, aşağıdaki değer eşlemeleri tipik Logo etiketlerine göre
 * yapıldı. Gerçek export gelince value-map'ler teyit edilecek.
 */
export interface CekSenetRow {
  kiymetTuru: string; // Çek / Senet
  cins: string; // Müşteri Çeki / Kendi Çekimiz
  cariHesap: string; // "kod / ad"
  kesideci: string;
  banka: string;
  vadeTarihi: string | null;
  tutar: number;
  durumu: string;
}

function mapType(raw: string): InstrumentType {
  return /senet/i.test(raw) ? 'promissory_note' : 'cheque';
}

function mapDirection(cins: string): InstrumentDirection {
  // "Kendi Çekimiz" / "Verilen" = issued; aksi received.
  if (/kendi|verilen|verdiğ/i.test(cins)) return 'issued';
  return 'received';
}

function mapStatus(raw: string): InstrumentStatus {
  const s = raw.trim().toLocaleLowerCase('tr');
  if (/teminat/.test(s)) return 'at_bank_collateral';
  if (/tahsilde|tahsil için|bankada/.test(s)) return 'at_bank_collection';
  if (/ciro/.test(s)) return 'endorsed';
  if (/tahsil edildi|tahsil ol|ödendi/.test(s)) return 'cleared';
  if (/karşılıksız|karsiliksiz/.test(s)) return 'bounced';
  if (/iptal/.test(s)) return 'cancelled';
  return 'portfolio'; // "Portföyde" ve tanınmayanlar
}

export type InstrumentExclusion =
  | 'collateral' // teminatta — nakit değil
  | 'endorsed' // ciro — open_item ile netleşir
  | 'cleared' // tahsil edilmiş — geçmiş
  | 'bounced'
  | 'cancelled';

export interface CekSenetResult {
  instruments: Instrument[];
  excluded: { reason: InstrumentExclusion; direction: InstrumentDirection; amount: number }[];
}

/**
 * Bir enstrümanın projeksiyona nakit katkısı. Yalnızca gelecekte gerçekten
 * nakde dönecekler sayılır (docs 3.3):
 *   received + portföyde/tahsilde → giriş
 *   issued  + portföyde/tahsilde → çıkış (kendi çekimiz vadesinde ödenir)
 *   teminat / ciro / tahsil edilmiş / karşılıksız / iptal → katkı yok
 */
export function instrumentContribution(
  inst: Pick<Instrument, 'direction' | 'status'>,
): { dir: 'in' | 'out' } | { dir: null; reason: InstrumentExclusion } {
  switch (inst.status) {
    case 'portfolio':
    case 'at_bank_collection':
      return { dir: inst.direction === 'received' ? 'in' : 'out' };
    case 'at_bank_collateral':
      return { dir: null, reason: 'collateral' };
    case 'endorsed':
      return { dir: null, reason: 'endorsed' };
    case 'cleared':
      return { dir: null, reason: 'cleared' };
    case 'bounced':
      return { dir: null, reason: 'bounced' };
    case 'cancelled':
      return { dir: null, reason: 'cancelled' };
  }
}

export function adaptCekSenet(rows: CekSenetRow[]): CekSenetResult {
  const instruments: Instrument[] = [];
  const excluded: CekSenetResult['excluded'] = [];

  for (const r of rows) {
    if (!r.tutar) continue;
    const { code, name } = splitCariHesap(r.cariHesap);
    const inst: Instrument = {
      instrument_type: mapType(r.kiymetTuru),
      direction: mapDirection(r.cins),
      party_code: code,
      party_name: name,
      drawer_name: r.kesideci.trim(),
      bank_name: r.banka.trim(),
      due_date: r.vadeTarihi,
      amount: r.tutar,
      status: mapStatus(r.durumu),
    };
    instruments.push(inst);
    const c = instrumentContribution(inst);
    if (c.dir === null) excluded.push({ reason: c.reason, direction: inst.direction, amount: inst.amount });
  }

  return { instruments, excluded };
}
