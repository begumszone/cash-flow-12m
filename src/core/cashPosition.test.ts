import { describe, it, expect } from 'vitest';
import { availableCash, restrictedCash, type CashAccount } from './cashPosition';

function acc(p: Partial<CashAccount>): CashAccount {
  return { id: 'x', kind: 'bank', name: '', balance: 0, restricted: false, ...p };
}

describe('cashPosition', () => {
  it('kullanılabilir nakit yalnızca bloke olmayanları toplar', () => {
    const list = [
      acc({ kind: 'cash', balance: 100000 }),
      acc({ kind: 'bank', balance: 500000 }),
      acc({ kind: 'bank', balance: 900000, restricted: true }), // teminat
    ];
    expect(availableCash(list)).toBe(600000);
    expect(restrictedCash(list)).toBe(900000);
  });

  it('boş liste 0 verir', () => {
    expect(availableCash([])).toBe(0);
  });
});
