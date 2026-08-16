import type { OpenItem } from '../core/openItem';

export interface PartyTotal {
  code: string;
  name: string;
  direction: 'in' | 'out';
  openAmount: number;
  itemCount: number;
  /** Kalemlerinden kaçının vadesi şüpheli/eksik (türetmeye muhtaç). */
  needsTermCount: number;
}

/**
 * Açık kalemleri cari + yön bazında toplar, açık tutara göre azalan sıralar.
 * Vade editörü büyük carilere önce odaklansın diye — birkaç büyük cariye vade
 * girmek toplamın çoğunu düzeltir.
 */
export function partyTotals(items: OpenItem[]): PartyTotal[] {
  const map = new Map<string, PartyTotal>();
  for (const it of items) {
    const key = `${it.party_code}|${it.direction}`;
    let t = map.get(key);
    if (!t) {
      t = {
        code: it.party_code,
        name: it.party_name,
        direction: it.direction,
        openAmount: 0,
        itemCount: 0,
        needsTermCount: 0,
      };
      map.set(key, t);
    }
    t.openAmount += it.open_amount;
    t.itemCount += 1;
    if (it.due_date_quality !== 'reliable') t.needsTermCount += 1;
  }
  return [...map.values()].sort((a, b) => b.openAmount - a.openAmount);
}
