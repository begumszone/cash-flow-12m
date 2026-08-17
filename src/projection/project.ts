import type { OpenItem } from '../core/openItem';
import type { Instrument } from '../core/instrument';
import type { CashCategory } from '../core/category';
import { categoryFor } from '../core/category';
import { instrumentContribution } from '../adapters/logo/cekSenet';
import {
  deriveEffectiveDueDate,
  type DeriveOptions,
  type EffectiveDueResult,
} from '../derive/effectiveDueDate';
import { horizonWeeks, weekIndexOf, type WeekSlot } from './weeks';

/**
 * Haftalık projeksiyon (docs 4.4). Açık kalemleri etkin vadelerinden haftalara
 * dağıtır, açılış bakiyesinden başlayarak her hafta için giriş/çıkış/net ve
 * devreden kapanış bakiyesini üretir.
 *
 * Üç senaryo, tahsilatın (giriş) zamanlamasıyla oynar — çıkış her zaman
 * vadesinde ödenir varsayılır (kendi ödemeni geciktirmek plan değil senaryo,
 * 4.1):
 *   - optimistic: tahsilat vadesinde gelir (gecikme yok), her şey dahil.
 *   - base:       tahsilat gecikmeyle gelir (projected_date), her şey dahil.
 *   - pessimistic: tahsilat gecikmeyle gelir VE yalnızca güvenilir/türetilmiş
 *                  vadeli girişler sayılır (assumed olanlar hariç), çıkışların
 *                  hepsi dahil.
 */
export type Scenario = 'optimistic' | 'base' | 'pessimistic';

export interface WeekProjection {
  key: string;
  start: string;
  opening: number;
  totalIn: number;
  totalOut: number;
  net: number;
  closing: number;
}

/**
 * Ufuk içindeki tek bir nakit hareketi — haftalık toplamların altındaki kalem.
 * Haftalık toplamlarla aynı pass'ten üretilir, sapma olmaz.
 */
export interface ScheduledFlow {
  weekIndex: number;
  date: string;
  direction: 'in' | 'out';
  amount: number;
  /** Cari adı (yoksa kodu). */
  label: string;
  kind: 'invoice' | 'cheque';
  /** Fatura türü ya da çek durumu — satırın ne olduğunu açıklar. */
  detail: string;
  /** Gelir/gider kategorisi (vergi, maaş, stok…). */
  category: CashCategory;
}

export interface ProjectionResult {
  weeks: WeekProjection[];
  /** Ufuk içindeki tüm hareketler, tarihe göre; yaklaşan ödeme/tahsilat listesi. */
  flows: ScheduledFlow[];
  /** Ufuk dışına (13 hafta sonrası) düşen, projeksiyona girmeyen tutarlar. */
  beyondHorizon: { in: number; out: number };
  /** Etkin vadesi hiç türetilemeyen (tarih yok) kalem tutarı. */
  undated: { in: number; out: number };
}

export interface ProjectOptions extends DeriveOptions {
  openingBalance: number;
  asOf: string;
  horizon?: number;
  scenario: Scenario;
  /** İsteğe bağlı çek/senet portföyü — vadeleri güvenilir, türetme gerekmez. */
  instruments?: Instrument[];
  /** Cari bazında elle atanmış gelir/gider kategorileri. */
  categories?: Map<string, CashCategory>;
}

/** Bir açık kalemin, seçilen senaryoda kullanılacak tarihi ve güveni. */
function scheduleDate(
  direction: 'in' | 'out',
  eff: EffectiveDueResult,
  scenario: Scenario,
): string | null {
  if (direction === 'out') return eff.due_date_effective;
  // giriş:
  if (scenario === 'optimistic') return eff.due_date_effective;
  return eff.projected_date; // base + pessimistic: gecikmeli
}

export function project(items: OpenItem[], opts: ProjectOptions): ProjectionResult {
  const n = opts.horizon ?? 13;
  const slots: WeekSlot[] = horizonWeeks(opts.asOf, n);
  const ins = new Array(n).fill(0);
  const outs = new Array(n).fill(0);
  const beyond = { in: 0, out: 0 };
  const undated = { in: 0, out: 0 };
  const flows: ScheduledFlow[] = [];

  for (const item of items) {
    const eff = deriveEffectiveDueDate(item, opts);

    // Pessimistic: assumed-güvenli girişleri dışla (belirsiz parayı sayma).
    if (opts.scenario === 'pessimistic' && item.direction === 'in' && eff.confidence === 'assumed') {
      continue;
    }

    const date = scheduleDate(item.direction, eff, opts.scenario);
    if (!date) {
      undated[item.direction] += item.open_amount;
      continue;
    }
    const idx = weekIndexOf(date, opts.asOf, n);
    if (idx === null) {
      beyond[item.direction] += item.open_amount;
      continue;
    }
    if (item.direction === 'in') ins[idx] += item.open_amount;
    else outs[idx] += item.open_amount;
    flows.push({
      weekIndex: idx,
      date,
      direction: item.direction,
      amount: item.open_amount,
      label: item.party_name || item.party_code,
      kind: 'invoice',
      detail: item.doc_type,
      category: categoryFor(item.direction, item.doc_type, item.party_code, opts.categories ?? new Map()),
    });
  }

  // Çek/senet: vadesi güvenilir, doğrudan haftaya düşer. Yalnızca nakde
  // dönecekler (portföy/tahsilde) katkı verir; teminat/ciro/karşılıksız hariç.
  for (const inst of opts.instruments ?? []) {
    const c = instrumentContribution(inst);
    if (c.dir === null) continue;
    if (!inst.due_date) {
      undated[c.dir] += inst.amount;
      continue;
    }
    const idx = weekIndexOf(inst.due_date, opts.asOf, n);
    if (idx === null) {
      beyond[c.dir] += inst.amount;
      continue;
    }
    if (c.dir === 'in') ins[idx] += inst.amount;
    else outs[idx] += inst.amount;
    flows.push({
      weekIndex: idx,
      date: inst.due_date,
      direction: c.dir,
      amount: inst.amount,
      label: inst.party_name || inst.party_code || inst.drawer_name,
      kind: 'cheque',
      detail: inst.instrument_type === 'promissory_note' ? 'Senet' : 'Çek',
      category: categoryFor(c.dir, 'Çek', inst.party_code, opts.categories ?? new Map()),
    });
  }

  flows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const weeks: WeekProjection[] = [];
  let opening = opts.openingBalance;
  for (let i = 0; i < n; i++) {
    const totalIn = ins[i];
    const totalOut = outs[i];
    const net = totalIn - totalOut;
    const closing = opening + net;
    const slot = slots[i]!;
    weeks.push({ key: slot.key, start: slot.start, opening, totalIn, totalOut, net, closing });
    opening = closing;
  }

  return { weeks, flows, beyondHorizon: beyond, undated };
}
