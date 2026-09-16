import type { Summary } from '../projection/summary';
import type { ProjectionResult } from '../projection/project';
import type { QualityReport } from '../quality/assess';
import { categoryBreakdown } from '../projection/categoryBreakdown';
import { formatTRY, shortDate, longDate, horizonLabel } from '../lib/format';

interface Props {
  summary: Summary;
  projection: ProjectionResult;
  quality: QualityReport;
  asOf: string;
  onOpenRisk: () => void;
  onOpenIncome: () => void;
  onOpenPayments: () => void;
  onExport: () => void;
}

/**
 * Yönetici Özeti — artık ayrı bir sayfa (sekme). Tek bakışta durum: (1) bu hafta
 * tahsilat/ödeme/net; (2) ufuk boyunca dip nokta; (3) para nereye gidiyor.
 * Detaya inmeden karar verilebilsin diye sade; kritik olan (negatif dip)
 * bordo renklenir, gerisi sakin.
 */
export function ExecutivePanel({
  summary,
  projection,
  quality,
  asOf,
  onOpenRisk,
  onOpenIncome,
  onOpenPayments,
  onExport,
}: Props) {
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

  // Veri dürüstlüğü: açık kalemlerin ne kadarı "şüpheli vade" (ERP'de vade =
  // belge tarihi) taşıyor? Yüksekse tutarlar ilk haftaya yığılır ve sonraki
  // haftalar olduğundan sakin görünür — yöneticiye bunu bir kez söyle.
  const totalAmt = quality.openItems.total.amount || 1;
  const suspectShare = quality.dueDate.suspect.amount / totalAmt;
  const showCaveat = suspectShare >= 0.4;

  return (
    <div className="exec-page">
      <div className="panel">
        <div className="panel__head">
          <div>
            <h2>Yönetici Özeti</h2>
            <p className="panel__lead" style={{ margin: 0 }}>
              {longDate(asOf)} · {hl} rolling görünüm
            </p>
          </div>
          <button className="btn btn--primary" onClick={onExport}>
            Excel'e aktar
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

        {showCaveat && (
          <p className="panel__note panel__note--info" style={{ marginTop: 14 }}>
            Not: Açık kalemlerin <strong>%{Math.round(suspectShare * 100)}</strong>'i ERP'de vade = belge
            tarihi taşıyor. Bu yüzden tutarların çoğu ilk haftaya yığılır ve sonraki haftalar
            olduğundan sakin görünebilir. Gerçek vadeleri <strong>Ayarlar → cari vade</strong> ile
            düzeltip tabloyu netleştirebilirsiniz.
          </p>
        )}
      </div>

      {/* Hızlı geçişler */}
      <div className="exec-nav">
        <button className="exec-nav__card" onClick={onOpenRisk}>
          <span className="exec-nav__title">Nakit sıkışıklığı</span>
          <span className="exec-nav__hint">
            {deficit
              ? `${summary.deficitWeeks} haftada açık — en dar anları gör`
              : 'En dar haftalar ve en büyük ödemeler'}
          </span>
        </button>
        <button className="exec-nav__card" onClick={onOpenIncome}>
          <span className="exec-nav__title">Gelecek tahsilatlar</span>
          <span className="exec-nav__hint">Kimden ne bekleniyor — günlük özet</span>
        </button>
        <button className="exec-nav__card" onClick={onOpenPayments}>
          <span className="exec-nav__title">Gönderilecek ödemeler</span>
          <span className="exec-nav__hint">Kime ne ödenecek — günlük özet</span>
        </button>
      </div>

      {topExpenseCats.length > 0 && (
        <div className="panel">
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
        </div>
      )}
    </div>
  );
}
