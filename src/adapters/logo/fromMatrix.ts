import type { BorcTakipRow } from './borcTakip';
import { parseLocaleNumber } from '../../lib/parseNumber';

/**
 * Borç Takip Raporu'nun ham hücre matrisini (satır 1 rapor başlığı, satır 2
 * kolon başlıkları, satır 3+ veri) isimli satırlara çevirir. Konumsal kolon
 * indeksleri gerçek export'tan doğrulandı (docs 6.1).
 *
 * Hem Node script'i hem tarayıcı okuyucusu bu tek fonksiyonu kullanır, böylece
 * kolon eşlemesi tek yerde durur.
 */

const COL = {
  cariHesap: 0,
  vadeTarihi: 2,
  islemTarihi: 3,
  belgeNo: 4,
  islemTuru: 5,
  borc: 6,
  alacak: 7,
  kapananBelgeNo: 11,
  kapananTutar: 14,
} as const;

function toIso(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // TR "12.06.2026"
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

export function rowsFromMatrix(matrix: unknown[][]): BorcTakipRow[] {
  const out: BorcTakipRow[] = [];
  for (let i = 2; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r) continue;
    const cari = toStr(r[COL.cariHesap]);
    if (cari === '') continue;
    out.push({
      cariHesap: cari,
      vadeTarihi: toIso(r[COL.vadeTarihi]),
      islemTarihi: toIso(r[COL.islemTarihi]),
      belgeNo: toStr(r[COL.belgeNo]),
      islemTuru: toStr(r[COL.islemTuru]),
      borc: toNum(r[COL.borc]),
      alacak: toNum(r[COL.alacak]),
      kapananBelgeNo: toStr(r[COL.kapananBelgeNo]),
      kapananTutar: toNum(r[COL.kapananTutar]),
    });
  }
  return out;
}
