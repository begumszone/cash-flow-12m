import type { OpenItem } from '../core/openItem';
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

export interface ProjectionResult {
  weeks: WeekProjection[];
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
  }

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

  return { weeks, beyondHorizon: beyond, undated };
}
