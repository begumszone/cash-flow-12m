import type { OpenItem } from '../core/openItem';
import type { AdapterResult, ExclusionReason } from '../adapters/logo/borcTakip';
import { looksLikeDocNo } from '../adapters/logo/borcTakip';

/**
 * Veri Kalitesi Paneli'nin sayısal çekirdeği (docs bölüm 5). Amaç eksik veriyi
 * gizlemek değil ÖLÇMEK: kaç kalem şüpheli vadeli, kaçının belge no'su bozuk,
 * ne kadar tutar ufuk dışına ya da vadesi geçmişe düşüyor. Her ölçüm adet +
 * tutar taşır, çünkü "50 kalem" ile "toplam 12M TL" farklı hikâyeler anlatır.
 */

export interface CountAmount {
  count: number;
  amount: number;
}

function emptyCA(): CountAmount {
  return { count: 0, amount: 0 };
}
function add(ca: CountAmount, amount: number): void {
  ca.count += 1;
  ca.amount += amount;
}

export interface QualityReport {
  openItems: {
    total: CountAmount;
    byDirection: { in: CountAmount; out: CountAmount };
  };
  dueDate: {
    reliable: CountAmount;
    /** Vade == fatura tarihi: Logo'nun boş vadeyi doldurduğu şüpheli kalemler. */
    suspect: CountAmount;
    missing: CountAmount;
  };
  /** Belge no'su fiş numarasına benzemeyen (açıklama düşmüş) açık kalemler. */
  suspectDocNo: CountAmount;
  excludedByReason: Record<ExclusionReason, CountAmount>;
  horizon: {
    overdue: CountAmount;
    within13Weeks: CountAmount;
    beyondHorizon: CountAmount;
    missingDue: CountAmount;
  };
}

const HORIZON_DAYS = 13 * 7;

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return Math.round((b - a) / 86_400_000);
}

export function assessQuality(result: AdapterResult, asOfIso: string): QualityReport {
  const report: QualityReport = {
    openItems: { total: emptyCA(), byDirection: { in: emptyCA(), out: emptyCA() } },
    dueDate: { reliable: emptyCA(), suspect: emptyCA(), missing: emptyCA() },
    suspectDocNo: emptyCA(),
    excludedByReason: {
      'cash-movement': emptyCA(),
      adjustment: emptyCA(),
      opening: emptyCA(),
      'unknown-type': emptyCA(),
      'fully-closed': emptyCA(),
      'zero-amount': emptyCA(),
    },
    horizon: { overdue: emptyCA(), within13Weeks: emptyCA(), beyondHorizon: emptyCA(), missingDue: emptyCA() },
  };

  for (const item of result.openItems) {
    const amt = item.open_amount;
    add(report.openItems.total, amt);
    add(report.openItems.byDirection[item.direction], amt);
    add(report.dueDate[item.due_date_quality], amt);
    if (!looksLikeDocNo(item.doc_no)) add(report.suspectDocNo, amt);
    classifyHorizon(report, item, asOfIso, amt);
  }

  for (const ex of result.excluded) {
    add(report.excludedByReason[ex.reason], ex.amount);
  }

  return report;
}

function classifyHorizon(report: QualityReport, item: OpenItem, asOfIso: string, amt: number): void {
  if (!item.due_date) {
    add(report.horizon.missingDue, amt);
    return;
  }
  const d = daysBetween(asOfIso, item.due_date);
  if (d < 0) add(report.horizon.overdue, amt);
  else if (d <= HORIZON_DAYS) add(report.horizon.within13Weeks, amt);
  else add(report.horizon.beyondHorizon, amt);
}
