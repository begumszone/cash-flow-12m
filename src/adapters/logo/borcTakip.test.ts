import { describe, it, expect } from 'vitest';
import { adaptBorcTakip, splitCariHesap, looksLikeDocNo, type BorcTakipRow } from './borcTakip';
import { assessQuality } from '../../quality/assess';

/** Test kurgu satırı üretici — yalnızca ilgili alanları verip gerisini doldurur. */
function row(p: Partial<BorcTakipRow>): BorcTakipRow {
  return {
    cariHesap: '120.01 / Test Cari',
    vadeTarihi: null,
    islemTarihi: null,
    belgeNo: '',
    islemTuru: '',
    borc: 0,
    alacak: 0,
    kapananBelgeNo: '',
    kapananTutar: 0,
    ...p,
  };
}

describe('splitCariHesap', () => {
  it('kod ile adı " / " ayracından böler', () => {
    expect(splitCariHesap('120.01.045 / Örnek Ticaret Ltd.')).toEqual({
      code: '120.01.045',
      name: 'Örnek Ticaret Ltd.',
    });
  });
  it('ayraç yoksa hepsini koda koyar', () => {
    expect(splitCariHesap('120.01.001')).toEqual({ code: '120.01.001', name: '' });
  });
});

describe('looksLikeDocNo', () => {
  it('gerçek fiş no kabul edilir', () => {
    expect(looksLikeDocNo('ORN2026000000001')).toBe(true);
    expect(looksLikeDocNo('000123')).toBe(true);
  });
  it('boşluklu / serbest metin reddedilir', () => {
    expect(looksLikeDocNo('Mı satış düzeltm')).toBe(false);
    expect(looksLikeDocNo('pay-tr 2026 VİR')).toBe(false);
    expect(looksLikeDocNo('')).toBe(false);
  });
});

describe('adaptBorcTakip', () => {
  it('satış faturasını giriş yönlü açık kalem yapar', () => {
    const { openItems } = adaptBorcTakip([
      row({ islemTuru: 'Perakende Satış Faturası', belgeNo: 'SAN1', borc: 3499, vadeTarihi: '2026-06-03', islemTarihi: '2026-06-01' }),
    ]);
    expect(openItems).toHaveLength(1);
    expect(openItems[0]).toMatchObject({ direction: 'in', open_amount: 3499, due_date_quality: 'reliable' });
  });

  it('satınalma faturasını çıkış yönlü yapar', () => {
    const { openItems } = adaptBorcTakip([
      row({ islemTuru: 'Satınalma Faturası', belgeNo: 'ALIS1', borc: 1000, vadeTarihi: '2026-07-01', islemTarihi: '2026-06-01' }),
    ]);
    expect(openItems[0]?.direction).toBe('out');
  });

  it('kapanan tutarı düşer; tam kapanmışı açık kalem saymaz', () => {
    const { openItems, excluded } = adaptBorcTakip([
      row({ islemTuru: 'Toptan Satış Faturası', belgeNo: 'SNL1', borc: 1000 }),
      // başka bir satır bu belgeyi kapatıyor:
      row({ islemTuru: 'Gelen Havale/EFT', belgeNo: 'EFT1', alacak: 1000, kapananBelgeNo: 'SNL1', kapananTutar: 1000 }),
    ]);
    expect(openItems).toHaveLength(0);
    expect(excluded.some((e) => e.reason === 'fully-closed')).toBe(true);
    expect(excluded.some((e) => e.reason === 'cash-movement')).toBe(true);
  });

  it('kısmi kapamada kalanı açık kalem yapar', () => {
    const { openItems } = adaptBorcTakip([
      row({ islemTuru: 'Toptan Satış Faturası', belgeNo: 'SNL2', borc: 1000 }),
      row({ islemTuru: 'Nakit Tahsilat', belgeNo: 'THS1', alacak: 300, kapananBelgeNo: 'SNL2', kapananTutar: 300 }),
    ]);
    expect(openItems).toHaveLength(1);
    expect(openItems[0]?.open_amount).toBe(700);
  });

  it('vade == fatura tarihi olanı şüpheli işaretler', () => {
    const { openItems } = adaptBorcTakip([
      row({ islemTuru: 'Perakende Satış Faturası', belgeNo: 'S1', borc: 500, vadeTarihi: '2026-06-01', islemTarihi: '2026-06-01' }),
    ]);
    expect(openItems[0]?.due_date_quality).toBe('suspect');
  });

  it('nakit hareketi ve virman açık kalem değildir', () => {
    const { openItems, excluded } = adaptBorcTakip([
      row({ islemTuru: 'Gelen Havale/EFT', belgeNo: '000123', alacak: 1250000 }),
      row({ islemTuru: 'Virman İşlemi', belgeNo: 'VIR1', alacak: 3499 }),
    ]);
    expect(openItems).toHaveLength(0);
    expect(excluded).toHaveLength(2);
    expect(excluded.every((e) => e.reason === 'cash-movement')).toBe(true);
  });

  it('iade faturası ilgili yönde negatif işaret taşır ve açık kalem olmaz', () => {
    const { openItems, excluded } = adaptBorcTakip([
      row({ islemTuru: 'Toptan Satış İade Faturası', belgeNo: 'IAD1', alacak: 200 }),
    ]);
    // amount = -200 -> open <= epsilon, açık kalem değil
    expect(openItems).toHaveLength(0);
    expect(excluded[0]?.reason).toBe('fully-closed');
  });
});

describe('assessQuality', () => {
  it('yönleri, şüpheli vadeyi ve ufku sayar', () => {
    const result = adaptBorcTakip([
      row({ islemTuru: 'Perakende Satış Faturası', belgeNo: 'A1', borc: 1000, vadeTarihi: '2026-08-20', islemTarihi: '2026-08-01' }),
      row({ islemTuru: 'Satınalma Faturası', belgeNo: 'B1', borc: 400, vadeTarihi: '2026-08-10', islemTarihi: '2026-08-10' }), // suspect + overdue
      row({ islemTuru: 'Toptan Satış Faturası', belgeNo: 'C1', borc: 700, vadeTarihi: '2027-01-01', islemTarihi: '2026-08-01' }), // beyond horizon
      row({ islemTuru: 'Perakende Satış Faturası', belgeNo: 'D1', borc: 250 }), // missing due
    ]);
    const q = assessQuality(result, '2026-08-13');
    expect(q.openItems.total.count).toBe(4);
    expect(q.openItems.byDirection.in.count).toBe(3);
    expect(q.openItems.byDirection.out.count).toBe(1);
    expect(q.dueDate.suspect.count).toBe(1);
    expect(q.dueDate.missing.count).toBe(1);
    expect(q.horizon.overdue.count).toBe(1);
    expect(q.horizon.within13Weeks.count).toBe(1);
    expect(q.horizon.beyondHorizon.count).toBe(1);
    expect(q.horizon.missingDue.count).toBe(1);
  });
});
