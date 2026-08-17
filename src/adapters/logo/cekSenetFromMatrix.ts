import type { CekSenetRow } from './cekSenet';
import { parseLocaleNumber } from '../../lib/parseNumber';

/**
 * Çek/Senet Raporu'nun ham hücre matrisini isimli satırlara çevirir. Kolon
 * düzeni (satır 1 başlık, satır 2 kolon başlıkları, satır 3+ veri) doğrulanacak
 * (docs 8) — gerçek export gelince indeksler teyit edilir.
 */

const COL = {
  kiymetTuru: 1,
  cins: 2,
  cariHesap: 3,
  kesideci: 4,
  banka: 5,
  vadeTarihi: 6,
  tutar: 7,
  durumu: 8,
} as const;

function toIso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const t = v.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (t) return `${t[3]}-${t[2]}-${t[1]}`;
  }
  return null;
}
function toNum(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  return parseLocaleNumber(v == null ? null : String(v)) ?? 0;
}
function toStr(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export function cekSenetRowsFromMatrix(matrix: unknown[][]): CekSenetRow[] {
  const out: CekSenetRow[] = [];
  for (let i = 2; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r) continue;
    const cari = toStr(r[COL.cariHesap]);
    const tutar = toNum(r[COL.tutar]);
    if (cari === '' && tutar === 0) continue;
    out.push({
      kiymetTuru: toStr(r[COL.kiymetTuru]),
      cins: toStr(r[COL.cins]),
      cariHesap: cari,
      kesideci: toStr(r[COL.kesideci]),
      banka: toStr(r[COL.banka]),
      vadeTarihi: toIso(r[COL.vadeTarihi]),
      tutar,
      durumu: toStr(r[COL.durumu]),
    });
  }
  return out;
}
