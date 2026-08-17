import type { ProjectionResult } from './project';
import type { AdapterResult } from '../adapters/logo/borcTakip';
import type { Instrument } from '../core/instrument';
import { instrumentContribution } from '../adapters/logo/cekSenet';

/**
 * Sayfanın en üstündeki özet dashboard'un rakamları. En kritik olanı en düşük
 * kapanış bakiyesi (likidite riski) — 13 hafta içinde nakit dibe vurduğu an.
 */
export interface Summary {
  /** Ufuk uzunluğu (hafta) — etiketler için. */
  horizonWeeks: number;
  openingBalance: number;
  endingBalance: number;
  /** 13 hafta içindeki en düşük kapanış ve hangi hafta. */
  lowestClosing: number;
  lowestWeekLabel: string;
  lowestWeekStart: string;
  /** En düşük kapanış negatifse kaç hafta açıkta. */
  deficitWeeks: number;
  totalIn: number;
  totalOut: number;
  /** Çek katkısı (yüklendiyse). */
  chequeIn: number;
  chequeOut: number;
  hasInstruments: boolean;
}

export function buildSummary(
  projection: ProjectionResult,
  _adapter: AdapterResult,
  instruments: Instrument[] | null,
): Summary {
  const weeks = projection.weeks;
  let lowest = Infinity;
  let lowestIdx = 0;
  let totalIn = 0;
  let totalOut = 0;
  let deficitWeeks = 0;
  weeks.forEach((w, i) => {
    if (w.closing < lowest) {
      lowest = w.closing;
      lowestIdx = i;
    }
    if (w.closing < 0) deficitWeeks += 1;
    totalIn += w.totalIn;
    totalOut += w.totalOut;
  });

  let chequeIn = 0;
  let chequeOut = 0;
  for (const inst of instruments ?? []) {
    const c = instrumentContribution(inst);
    if (c.dir === 'in') chequeIn += inst.amount;
    else if (c.dir === 'out') chequeOut += inst.amount;
  }

  const lowestWeek = weeks[lowestIdx];
  return {
    horizonWeeks: weeks.length,
    openingBalance: weeks[0]?.opening ?? 0,
    endingBalance: weeks[weeks.length - 1]?.closing ?? 0,
    lowestClosing: Number.isFinite(lowest) ? lowest : 0,
    lowestWeekLabel: lowestWeek?.key ?? '',
    lowestWeekStart: lowestWeek?.start ?? '',
    deficitWeeks,
    totalIn,
    totalOut,
    chequeIn,
    chequeOut,
    hasInstruments: (instruments?.length ?? 0) > 0,
  };
}
