import type { Summary } from '../projection/summary';
import type { ProjectionResult } from '../projection/project';
import { formatTRY, shortDate } from '../lib/format';

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
 * Yönetici Özeti — yöneticiye tek bakışta durum. Detay yok: açılış, dip nokta,
 * 13 hafta sonu, en büyük ödemeler ve kritik haftalar. Karar için gereken kadar.
 */
export function ExecutiveSummary({ summary, projection, asOf, onClose, onExport }: Props) {
  const deficit = summary.lowestClosing < 0;
  const net = summary.totalIn - summary.totalOut;

  const topPayments = projection.flows
    .filter((f) => f.direction === 'out')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const deficitWeeks = projection.weeks.filter((w) => w.closing < 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__head">
          <div>
            <h2>Yönetici Özeti</h2>
            <p className="modal__date">{longDate(asOf)} · 13 haftalık görünüm</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className={`verdict ${deficit ? 'verdict--bad' : 'verdict--good'}`}>
          {deficit ? (
            <>
              <strong>Dikkat:</strong> Önümüzdeki 13 haftada {summary.deficitWeeks} hafta nakit açığı
              görünüyor. En düşük nokta <strong>{formatTRY(summary.lowestClosing)} ₺</strong> (
              {shortDate(summary.lowestWeekStart)} haftası). Önlem gerekebilir.
            </>
          ) : (
            <>
              <strong>Durum olumlu:</strong> Nakit ufuk boyunca pozitif kalıyor. En düşük nokta{' '}
              <strong>{formatTRY(summary.lowestClosing)} ₺</strong> ({shortDate(summary.lowestWeekStart)}{' '}
              haftası).
            </>
          )}
        </div>

        <div className="exec-figures">
          <div className="exec-fig">
            <span className="exec-fig__label">Açılış nakdi</span>
            <span className="exec-fig__value">{formatTRY(summary.openingBalance)} ₺</span>
          </div>
          <div className="exec-fig">
            <span className="exec-fig__label">En düşük nokta</span>
            <span className={`exec-fig__value ${deficit ? 'neg' : ''}`}>
              {formatTRY(summary.lowestClosing)} ₺
            </span>
          </div>
          <div className="exec-fig">
            <span className="exec-fig__label">13 hafta sonu</span>
            <span className="exec-fig__value">{formatTRY(summary.endingBalance)} ₺</span>
          </div>
          <div className="exec-fig">
            <span className="exec-fig__label">Net (13 hafta)</span>
            <span className={`exec-fig__value ${net < 0 ? 'neg' : 'pos'}`}>{formatTRY(net)} ₺</span>
          </div>
        </div>

        <div className="exec-cols">
          <div>
            <h3 className="exec-h3">En büyük ödemeler</h3>
            <ul className="exec-list">
              {topPayments.length === 0 && <li className="muted">—</li>}
              {topPayments.map((f, i) => (
                <li key={i}>
                  <span className="exec-list__party" title={f.label}>
                    {f.label}
                  </span>
                  <span className="exec-list__date">{shortDate(f.date)}</span>
                  <span className="exec-list__amt neg">{formatTRY(f.amount)} ₺</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="exec-h3">Kritik haftalar</h3>
            {deficitWeeks.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Nakit açığı olan hafta yok.
              </p>
            ) : (
              <ul className="exec-list">
                {deficitWeeks.map((w) => (
                  <li key={w.key}>
                    <span className="exec-list__party">{w.key}</span>
                    <span className="exec-list__date">{shortDate(w.start)}</span>
                    <span className="exec-list__amt neg">{formatTRY(w.closing)} ₺</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

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
