import type { Summary } from '../projection/summary';
import type { ProjectionResult } from '../projection/project';
import { categoryBreakdown } from '../projection/categoryBreakdown';
import { formatTRY, shortDate, horizonLabel } from '../lib/format';

interface Props {
  summary: Summary;
  projection: ProjectionResult;
  asOf: string;
  onClose: () => void;
  onExport: () => void;
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Yönetici Özeti — tek bakışta durum. İki katman: (1) BU HAFTA (raporun alındığı
 * hafta) toplam tahsilat/ödeme/net; (2) ufuk boyunca dip nokta. Sade tutulur,
 * yalnızca gerçekten kritik olan (negatif dip) renklenir.
 */
export function ExecutiveSummary({ summary, projection, asOf, onClose, onExport }: Props) {
  const deficit = summary.lowestClosing < 0;
  const hl = horizonLabel(summary.horizonWeeks);
  const w0 = projection.weeks[0];

  // Bu haftanın çek kısmı (kalemlerden).
  let weekChequeIn = 0;
  let weekChequeOut = 0;
  for (const f of projection.flows) {
    if (f.weekIndex !== 0 || f.kind !== 'cheque') continue;
    if (f.direction === 'in') weekChequeIn += f.amount;
    else weekChequeOut += f.amount;
  }

  const breakdown = categoryBreakdown(projection.flows);
  const topExpenseCats = breakdown.expense.slice(0, 5);
  const maxCat = topExpenseCats[0]?.amount ?? 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <div>
            <h2>Yönetici Özeti</h2>
            <p className="modal__date">{longDate(asOf)} · {hl} rolling görünüm</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        {/* BU HAFTA */}
        <h3 className="exec-h3">Bu hafta {w0 && <span className="muted">· {shortDate(w0.start)}</span>}</h3>
        <div className="exec-week">
          <div className="exec-week__tile">
            <span className="exec-week__label">Tahsilat</span>
            <span className="exec-week__value pos">{formatTRY(w0?.totalIn ?? 0)} ₺</span>
            {weekChequeIn > 0 && <span className="exec-week__sub">{formatTRY(weekChequeIn)} ₺ çek</span>}
          </div>
          <div className="exec-week__tile">
            <span className="exec-week__label">Ödeme</span>
            <span className="exec-week__value neg">{formatTRY(w0?.totalOut ?? 0)} ₺</span>
            {weekChequeOut > 0 && <span className="exec-week__sub">{formatTRY(weekChequeOut)} ₺ çek</span>}
          </div>
          <div className="exec-week__tile">
            <span className="exec-week__label">Net</span>
            <span className={`exec-week__value ${(w0?.net ?? 0) < 0 ? 'neg' : 'pos'}`}>
              {formatTRY(w0?.net ?? 0)} ₺
            </span>
            <span className="exec-week__sub">kapanış {formatTRY(w0?.closing ?? 0)} ₺</span>
          </div>
        </div>

        {/* UFUK DURUMU */}
        <h3 className="exec-h3">{hl} genel</h3>
        <p className="exec-verdict">
          {deficit ? (
            <>
              <span className="chip-dot dot-out" /> {summary.deficitWeeks} haftada nakit açığı; en düşük{' '}
              <strong className="neg">{formatTRY(summary.lowestClosing)} ₺</strong> (
              {shortDate(summary.lowestWeekStart)} haftası).
            </>
          ) : (
            <>
              <span className="chip-dot dot-in" /> Nakit ufuk boyunca pozitif; en düşük{' '}
              <strong>{formatTRY(summary.lowestClosing)} ₺</strong> ({shortDate(summary.lowestWeekStart)}{' '}
              haftası).
            </>
          )}
        </p>
        <div className="exec-mini">
          <span>
            Açılış <strong>{formatTRY(summary.openingBalance)} ₺</strong>
          </span>
          <span>
            {hl} sonu <strong>{formatTRY(summary.endingBalance)} ₺</strong>
          </span>
          <span>
            Toplam tahsilat <strong className="pos">{formatTRY(summary.totalIn)} ₺</strong>
          </span>
          <span>
            Toplam ödeme <strong className="neg">{formatTRY(summary.totalOut)} ₺</strong>
          </span>
        </div>

        {topExpenseCats.length > 0 && (
          <>
            <h3 className="exec-h3">Ödemeler nereye gidiyor</h3>
            <ul className="cat-bars">
              {topExpenseCats.map((c) => (
                <li key={c.key} className="cat-bar">
                  <span className="cat-bar__label">{c.label}</span>
                  <span className="cat-bar__track">
                    <span className="cat-bar__fill" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                  </span>
                  <span className="cat-bar__amt neg">{formatTRY(c.amount)} ₺</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal__foot">
          <button className="btn" onClick={onClose}>
            Kapat
          </button>
          <button className="btn btn--primary" onClick={onExport}>
            Excel'e aktar
          </button>
        </div>
      </div>
    </div>
  );
}
