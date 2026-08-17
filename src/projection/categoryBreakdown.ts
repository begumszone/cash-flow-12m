import type { ScheduledFlow } from './project';
import type { CashCategory } from '../core/category';
import { categoryLabel } from '../core/category';

export interface CategoryLine {
  key: CashCategory;
  label: string;
  direction: 'in' | 'out';
  amount: number;
  count: number;
}

/**
 * Ufuk içindeki akışları kategoriye göre toplar (vergi X, maaş Y, stok Z…).
 * Tutara göre azalan; "para en çok nereye gidiyor / nereden geliyor" sorusu.
 */
export function categoryBreakdown(flows: ScheduledFlow[]): { income: CategoryLine[]; expense: CategoryLine[] } {
  const map = new Map<CashCategory, CategoryLine>();
  for (const f of flows) {
    let line = map.get(f.category);
    if (!line) {
      line = { key: f.category, label: categoryLabel(f.category), direction: f.direction, amount: 0, count: 0 };
      map.set(f.category, line);
    }
    line.amount += f.amount;
    line.count += 1;
  }
  const all = [...map.values()].sort((a, b) => b.amount - a.amount);
  return {
    income: all.filter((l) => l.direction === 'in'),
    expense: all.filter((l) => l.direction === 'out'),
  };
}
