import { describe, it, expect } from 'vitest';
import { mondayOf, isoWeekKey, horizonWeeks, weekIndexOf } from './weeks';
import { project } from './project';
import type { OpenItem } from '../core/openItem';

function item(p: Partial<OpenItem>): OpenItem {
  return {
    party_code: 'C1',
    party_name: '',
    direction: 'in',
    doc_type: 'Perakende Satış Faturası',
    doc_no: 'X',
    doc_date: '2026-08-17',
    due_date: null,
    due_date_quality: 'reliable',
    amount_original: 0,
    closed_amount: 0,
    open_amount: 0,
    ...p,
  };
}

describe('ISO hafta', () => {
  it('mondayOf haftanın Pazartesi\'sini verir', () => {
    expect(mondayOf('2026-08-19')).toBe('2026-08-17'); // Çarşamba -> Pzt
    expect(mondayOf('2026-08-17')).toBe('2026-08-17');
    expect(mondayOf('2026-08-23')).toBe('2026-08-17'); // Pazar -> aynı hafta Pzt
  });
  it('isoWeekKey doğru hafta üretir', () => {
    expect(isoWeekKey('2026-08-17')).toBe('2026-W34');
  });
  it('horizonWeeks n slot üretir, ilk slot asOf haftası', () => {
    const w = horizonWeeks('2026-08-19', 13);
    expect(w).toHaveLength(13);
    expect(w[0]!.start).toBe('2026-08-17');
  });
  it('weekIndexOf: geçmiş 0\'a, ufuk dışı null', () => {
    expect(weekIndexOf('2026-08-19', '2026-08-19', 13)).toBe(0);
    expect(weekIndexOf('2026-07-01', '2026-08-19', 13)).toBe(0); // vadesi geçmiş -> ilk hafta
    expect(weekIndexOf('2026-09-01', '2026-08-19', 13)).toBe(2);
    expect(weekIndexOf('2027-01-01', '2026-08-19', 13)).toBeNull(); // ufuk dışı
  });
});

describe('project', () => {
  const base = { openingBalance: 1000, asOf: '2026-08-17', horizon: 13, scenario: 'base' as const };

  it('açılış bakiyesinden devreden kapanış üretir', () => {
    const r = project(
      [
        item({ direction: 'in', open_amount: 500, due_date: '2026-08-20', due_date_quality: 'reliable' }),
        item({ direction: 'out', open_amount: 200, due_date: '2026-08-20', due_date_quality: 'reliable' }),
      ],
      base,
    );
    expect(r.weeks[0]!.opening).toBe(1000);
    expect(r.weeks[0]!.totalIn).toBe(500);
    expect(r.weeks[0]!.totalOut).toBe(200);
    expect(r.weeks[0]!.net).toBe(300);
    expect(r.weeks[0]!.closing).toBe(1300);
    expect(r.weeks[1]!.opening).toBe(1300); // devreder
  });

  it('ufuk dışını ayrı toplar, projeksiyona koymaz', () => {
    const r = project(
      [item({ direction: 'in', open_amount: 900, due_date: '2027-01-01', due_date_quality: 'reliable' })],
      base,
    );
    expect(r.beyondHorizon.in).toBe(900);
    expect(r.weeks.every((w) => w.totalIn === 0)).toBe(true);
  });

  it('pessimistic senaryoda assumed-vadeli girişi dışlar', () => {
    // vade yok + cari vadesi yok -> assumed
    const it = item({ direction: 'in', open_amount: 400, due_date: null, due_date_quality: 'missing' });
    const pess = project([it], { ...base, scenario: 'pessimistic' });
    const opt = project([it], { ...base, scenario: 'optimistic' });
    const totalPess = pess.weeks.reduce((s, w) => s + w.totalIn, 0);
    const totalOpt = opt.weeks.reduce((s, w) => s + w.totalIn, 0);
    expect(totalPess).toBe(0); // dışlandı
    expect(totalOpt).toBe(400); // dahil
  });

  it('optimistic girişi vadesinde, base gecikmeyle koyar', () => {
    const terms = new Map([['C1', { default_term_days: 0, avg_delay_days: 21 }]]);
    const it = item({ direction: 'in', open_amount: 100, due_date: null, due_date_quality: 'missing', doc_date: '2026-08-17' });
    const opt = project([it], { ...base, scenario: 'optimistic', terms });
    const bs = project([it], { ...base, scenario: 'base', terms });
    // optimistic: 08-17 haftası (0). base: +21 gün -> 09-07 haftası (idx 3).
    expect(opt.weeks[0]!.totalIn).toBe(100);
    expect(bs.weeks[0]!.totalIn).toBe(0);
    expect(bs.weeks[3]!.totalIn).toBe(100);
  });
});
