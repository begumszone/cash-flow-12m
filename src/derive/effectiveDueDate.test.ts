import { describe, it, expect } from 'vitest';
import {
  deriveEffectiveDueDate,
  addDays,
  type EffectiveDueInput,
  type PartyTerms,
} from './effectiveDueDate';

function input(p: Partial<EffectiveDueInput>): EffectiveDueInput {
  return {
    party_code: 'C1',
    direction: 'in',
    doc_date: '2026-06-01',
    due_date: null,
    due_date_quality: 'missing',
    ...p,
  };
}

describe('addDays', () => {
  it('ay/yıl sınırını doğru geçer', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-20', 30)).toBe('2027-01-19');
  });
});

describe('deriveEffectiveDueDate — öncelik zinciri', () => {
  it('1) manuel override her şeyi ezer', () => {
    const r = deriveEffectiveDueDate(
      input({ due_date: '2026-06-30', due_date_quality: 'reliable' }),
      { overrides: new Map([['C1', '2026-09-09']]) },
    );
    expect(r).toMatchObject({ due_date_effective: '2026-09-09', due_source: 'override' });
  });

  it('2) ERP vadesi güvenilirse kullanılır', () => {
    const r = deriveEffectiveDueDate(input({ due_date: '2026-07-15', due_date_quality: 'reliable' }));
    expect(r).toMatchObject({ due_date_effective: '2026-07-15', due_source: 'erp', confidence: 'reliable' });
  });

  it('3) şüpheli vade + cari vadesi → fatura tarihi + vade (asıl senaryo)', () => {
    // %97,7 durum: vade=fatura tarihi (suspect), ama cari 45 gün vadeli.
    const terms = new Map<string, PartyTerms>([['C1', { default_term_days: 45 }]]);
    const r = deriveEffectiveDueDate(
      input({ due_date: '2026-06-01', due_date_quality: 'suspect' }),
      { terms },
    );
    expect(r).toMatchObject({ due_date_effective: '2026-07-16', due_source: 'party-term', confidence: 'derived' });
  });

  it('4) hiçbiri yoksa yön bazlı varsayılan + assumed', () => {
    const r = deriveEffectiveDueDate(input({ direction: 'out', due_date_quality: 'suspect' }), {
      fallbackTermDays: { in: 30, out: 60 },
    });
    expect(r).toMatchObject({ due_date_effective: '2026-07-31', due_source: 'assumed', confidence: 'assumed' });
  });

  it('şüpheli vadeyi ERP olarak KULLANMAZ (sadece reliable geçer)', () => {
    const r = deriveEffectiveDueDate(input({ due_date: '2026-06-01', due_date_quality: 'suspect' }));
    expect(r.due_source).not.toBe('erp');
  });
});

describe('tahsilat gecikmesi', () => {
  it('giriş tarafında avg_delay_days projeksiyona eklenir', () => {
    const terms = new Map<string, PartyTerms>([['C1', { default_term_days: 30, avg_delay_days: 12 }]]);
    const r = deriveEffectiveDueDate(input({ direction: 'in', due_date_quality: 'suspect' }), { terms });
    expect(r.due_date_effective).toBe('2026-07-01'); // 06-01 + 30
    expect(r.projected_date).toBe('2026-07-13'); // + 12 gecikme
  });

  it('çıkış tarafında gecikme UYGULANMAZ', () => {
    const terms = new Map<string, PartyTerms>([['C1', { default_term_days: 30, avg_delay_days: 12 }]]);
    const r = deriveEffectiveDueDate(input({ direction: 'out', due_date_quality: 'suspect' }), { terms });
    expect(r.projected_date).toBe(r.due_date_effective); // gecikme yok
  });
});
