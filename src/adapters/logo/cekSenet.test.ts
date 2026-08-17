import { describe, it, expect } from 'vitest';
import { adaptCekSenet, instrumentContribution, type CekSenetRow } from './cekSenet';
import { project } from '../../projection/project';

function row(p: Partial<CekSenetRow>): CekSenetRow {
  return {
    kiymetTuru: 'Çek',
    cins: 'Müşteri Çeki',
    cariHesap: '120.01 / Test',
    kesideci: 'Keşideci',
    banka: 'Banka',
    vadeTarihi: '2026-09-01',
    tutar: 100000,
    durumu: 'Portföyde',
    ...p,
  };
}

describe('adaptCekSenet — durum eşlemesi', () => {
  it('portföydeki müşteri çeki giriş sayılır', () => {
    const { instruments } = adaptCekSenet([row({})]);
    expect(instruments[0]).toMatchObject({ direction: 'received', status: 'portfolio' });
    expect(instrumentContribution(instruments[0]!)).toEqual({ dir: 'in' });
  });

  it('kendi çekimiz çıkış sayılır', () => {
    const { instruments } = adaptCekSenet([row({ cins: 'Kendi Çekimiz' })]);
    expect(instruments[0]?.direction).toBe('issued');
    expect(instrumentContribution(instruments[0]!)).toEqual({ dir: 'out' });
  });

  it('teminattaki çek nakit sayılmaz', () => {
    const { instruments, excluded } = adaptCekSenet([row({ durumu: 'Bankada Teminatta' })]);
    expect(instruments[0]?.status).toBe('at_bank_collateral');
    expect(instrumentContribution(instruments[0]!)).toMatchObject({ dir: null, reason: 'collateral' });
    expect(excluded[0]?.reason).toBe('collateral');
  });

  it('ciro / karşılıksız / iptal katkı vermez', () => {
    const { instruments } = adaptCekSenet([
      row({ durumu: 'Ciro Edildi' }),
      row({ durumu: 'Karşılıksız' }),
      row({ durumu: 'İptal' }),
    ]);
    expect(instruments.map((i) => instrumentContribution(i).dir)).toEqual([null, null, null]);
  });

  it('senet türünü tanır', () => {
    const { instruments } = adaptCekSenet([row({ kiymetTuru: 'Senet' })]);
    expect(instruments[0]?.instrument_type).toBe('promissory_note');
  });
});

describe('projeksiyona çek entegrasyonu', () => {
  const base = { openingBalance: 0, asOf: '2026-08-17', horizon: 13, scenario: 'base' as const };

  it('portföydeki müşteri çeki giriş haftasına düşer', () => {
    const { instruments } = adaptCekSenet([row({ vadeTarihi: '2026-09-01', tutar: 500000 })]);
    const r = project([], { ...base, instruments });
    const total = r.weeks.reduce((s, w) => s + w.totalIn, 0);
    expect(total).toBe(500000);
  });

  it('teminattaki çek projeksiyona girmez', () => {
    const { instruments } = adaptCekSenet([row({ durumu: 'Teminatta', tutar: 500000 })]);
    const r = project([], { ...base, instruments });
    expect(r.weeks.reduce((s, w) => s + w.totalIn, 0)).toBe(0);
  });

  it('kendi çekimiz çıkış olarak düşer', () => {
    const { instruments } = adaptCekSenet([
      row({ cins: 'Kendi Çekimiz', vadeTarihi: '2026-09-01', tutar: 300000 }),
    ]);
    const r = project([], { ...base, instruments });
    expect(r.weeks.reduce((s, w) => s + w.totalOut, 0)).toBe(300000);
  });
});
