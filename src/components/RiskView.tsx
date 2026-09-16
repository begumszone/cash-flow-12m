import { useMemo } from 'react';
import type { ProjectionResult } from '../projection/project';
import type { Summary } from '../projection/summary';
import type { QualityReport } from '../quality/assess';
import { formatTRY, shortDate, horizonLabel } from '../lib/format';

interface Props {
  projection: ProjectionResult;
  summary: Summary;
  quality: QualityReport;
}

/**
 * Nakit Sıkışıklığı — şirket ne zaman zora girer? Üç şeyi öne çıkarır:
 * (1) ilk açık haftası / ufuk boyunca en dar an; (2) en dar haftalar sıralı;
 * (3) sıkışıklığa yol açabilecek en büyük yaklaşan ödemeler. Ayrıca veriyi
 * dürüstçe uyarır: kalemlerin çoğu şüpheli vade taşıyıp ilk haftaya yığılıyorsa
 * sonraki haftaların "sakin" görünmesi gerçek değil, veri eksiğidir.
 */
export function RiskView({ projection, summary, quality }: Props) {
  const weeks = projection.weeks;
  const hl = horizonLabel(weeks.length);
  const deficit = summary.lowestClosing < 0;
  const firstNegative = weeks.find((w) => w.closing < 0) ?? null;

  const tightest = useMemo(
    () => [...weeks].map((w, i) => ({ w, i })).sort((a, b) => a.w.closing - b.w.closing).slice(0, 8),
    [weeks],
  );

  const topOut = useMemo(
    () =>
      projection.flows
        .filter((f) => f.direction === 'out')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
    [projection.flows],
  );

  // Nakit hareketinin ne kadarı ilk haftaya yığılmış?
  const totalFlow = weeks.reduce((s, w) => s + w.totalIn + w.totalOut, 0) || 1;
  const week0Flow = (weeks[0]?.totalIn ?? 0) + (weeks[0]?.totalOut ?? 0);
  const concentration = week0Flow / totalFlow;

  const totalAmt = quality.openItems.total.amount || 1;
  const suspectShare = quality.dueDate.suspect.amount / totalAmt;
  const showCaveat = suspectShare >= 0.4 || concentration >= 0.6;

  return (
    <section className="panel">
      <h2>Nakit Sıkışıklığı</h2>
      <p className="panel__lead">
        Şirketin ne zaman nakit sıkışıklığı yaşayabileceği. Kapanış bakiyesinin en dip yaptığı
        haftalar ve buna yol açabilecek en büyük ödemeler.
      </p>

      {deficit ? (
        <p className="panel__note panel__note--bad">
          {firstNegative && (
            <>
              İlk nakit açığı <strong>{shortDate(firstNegative.start)} haftası</strong> ·{' '}
            </>
          )}
          {summary.deficitWeeks} haftada açık; en düşük kapanış{' '}
          <strong>{formatTRY(summary.lowestClosing)} ₺</strong> ({shortDate(summary.lowestWeekStart)}{' '}
          haftası). Bu haftalara girmeden tahsilatı hızlandırma / ödemeyi öteleme gerekebilir.
        </p>
      ) : (
        <p className="panel__note panel__note--good">
          {hl} boyunca açık görünmüyor. En dar an{' '}
          <strong>{formatTRY(summary.lowestClosing)} ₺</strong> ({shortDate(summary.lowestWeekStart)}{' '}
          haftası) — yine de tampon burada en incedir.
        </p>
      )}

      {showCaveat && (
        <p className="panel__note panel__note--info">
          <strong>Dikkat:</strong> Açık kalemlerin %{Math.round(suspectShare * 100)}'i ERP'de vade =
          belge tarihi taşıyor ve nakit hareketinin %{Math.round(concentration * 100)}'i ilk haftaya
          düşüyor. Bu yüzden sonraki haftalar olduğundan <strong>sakin</strong> görünebilir — tablo
          "toz pembe" ise sebebi büyük ihtimalle budur. Gerçek vadeleri{' '}
          <strong>Ayarlar → cari vade</strong> altında girerek dağılımı düzeltebilirsiniz.
        </p>
      )}

      <h3 className="exec-h3" style={{ marginTop: 18 }}>
        En dar haftalar
      </h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hafta</th>
              <th className="num">Açılış</th>
              <th className="num">Giriş</th>
              <th className="num">Çıkış</th>
              <th className="num">Kapanış</th>
            </tr>
          </thead>
          <tbody>
            {tightest.map(({ w }) => (
              <tr key={w.key} className={w.closing < 0 ? 'row--neg' : ''}>
                <td>
                  {w.key} · {shortDate(w.start)}
                </td>
                <td className="num">{formatTRY(w.opening)}</td>
                <td className="num pos">{w.totalIn ? formatTRY(w.totalIn) : '—'}</td>
                <td className="num neg">{w.totalOut ? formatTRY(w.totalOut) : '—'}</td>
                <td className={`num strong ${w.closing < 0 ? 'neg' : ''}`}>{formatTRY(w.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {topOut.length > 0 && (
        <>
          <h3 className="exec-h3" style={{ marginTop: 20 }}>
            En büyük yaklaşan ödemeler
          </h3>
          <ul className="risk-top">
            {topOut.map((f, idx) => (
              <li key={idx} className="risk-top__row">
                <span className="risk-top__date">{shortDate(f.date)}</span>
                <span className="risk-top__party" title={f.label}>
                  {f.label || '—'}
                </span>
                <span className={`risk-top__kind ${f.kind === 'cheque' ? 'kind-cheque' : ''}`}>
                  {f.detail}
                </span>
                <span className="risk-top__amt neg">−{formatTRY(f.amount)} ₺</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
