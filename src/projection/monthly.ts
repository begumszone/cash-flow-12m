import type { WeekProjection } from './project';

export interface MonthProjection {
  key: string; // "YYYY-MM"
  label: string; // "Ağu 2026"
  opening: number;
  totalIn: number;
  totalOut: number;
  net: number;
  closing: number;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Haftalık projeksiyonu takvim ayına toplar (12 ay için 52 satır yerine 12).
 * Bir hafta, Pazartesi'sinin ayına yazılır. Ay açılışı = o aya düşen ilk
 * haftanın açılışı; ay kapanışı = son haftanın kapanışı (devreden bakiye
 * doğru zincirlensin diye); giriş/çıkış toplanır.
 */
export function monthlyRollup(weeks: WeekProjection[]): MonthProjection[] {
  const groups = new Map<string, WeekProjection[]>();
  const order: string[] = [];
  for (const w of weeks) {
    const key = w.start.slice(0, 7);
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
      order.push(key);
    }
    arr.push(w);
  }
  return order.map((key) => {
    const ws = groups.get(key)!;
    const totalIn = ws.reduce((s, w) => s + w.totalIn, 0);
    const totalOut = ws.reduce((s, w) => s + w.totalOut, 0);
    return {
      key,
      label: monthLabel(key),
      opening: ws[0]!.opening,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      closing: ws[ws.length - 1]!.closing,
    };
  });
}
