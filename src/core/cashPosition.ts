/**
 * Açılış nakit pozisyonu (docs 3.8 `bank_balance`). Projeksiyonun başladığı
 * nokta: bir önceki gece kapanışındaki kasa + banka bakiyelerinin toplamı.
 * Bloke/teminattaki hesaplar (`restricted`) kullanılabilir nakde dahil edilmez.
 */

export type AccountKind = 'bank' | 'cash';

export interface CashAccount {
  id: string;
  kind: AccountKind;
  name: string;
  balance: number;
  /** Bloke / teminat — kullanılabilir nakde dahil değil. */
  restricted: boolean;
}

/** Projeksiyonun açılış bakiyesi: yalnızca bloke olmayan hesapların toplamı. */
export function availableCash(accounts: CashAccount[]): number {
  return accounts.filter((a) => !a.restricted).reduce((s, a) => s + a.balance, 0);
}

/** Bloke/teminattaki toplam — ayrı gösterilir, açılışa katılmaz. */
export function restrictedCash(accounts: CashAccount[]): number {
  return accounts.filter((a) => a.restricted).reduce((s, a) => s + a.balance, 0);
}
