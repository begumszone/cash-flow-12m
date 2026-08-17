import { describe, it, expect } from 'vitest';
import { monthlyRollup } from './monthly';
import type { WeekProjection } from './project';

function wk(p: Partial<WeekProjection>): WeekProjection {
  return { key: '', start: '2026-08-17', opening: 0, totalIn: 0, totalOut: 0, net: 0, closing: 0, ...p };
}

describe('monthlyRollup', () => {
  it('haftaları takvim ayına toplar', () => {
    const weeks = [
      wk({ start: '2026-08-17', opening: 1000, totalIn: 200, totalOut: 100, net: 100, closing: 1100 }),
      wk({ start: '2026-08-24', opening: 1100, totalIn: 300, totalOut: 50, net: 250, closing: 1350 }),
      wk({ start: '2026-09-07', opening: 1350, totalIn: 0, totalOut: 400, net: -400, closing: 950 }),
    ];
    const m = monthlyRollup(weeks);
    expect(m).toHaveLength(2);
    // Ağustos: 2 hafta
    expect(m[0]!.key).toBe('2026-08');
    expect(m[0]!.opening).toBe(1000); // ilk haftanın açılışı
    expect(m[0]!.totalIn).toBe(500);
    expect(m[0]!.totalOut).toBe(150);
    expect(m[0]!.closing).toBe(1350); // son haftanın kapanışı
    // Eylül
    expect(m[1]!.key).toBe('2026-09');
    expect(m[1]!.closing).toBe(950);
  });
});
