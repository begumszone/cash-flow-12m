import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { ProjectionResult } from '../projection/project';
import { formatTRY, shortDate } from '../lib/format';

interface Props {
  result: ProjectionResult;
}

/** 13 haftalık projeksiyon: giriş/çıkış barları + devreden kapanış çizgisi. */
export function ProjectionView({ result }: Props) {
  const data = result.weeks.map((w) => ({
    label: shortDate(w.start),
    giris: Math.round(w.totalIn),
    cikis: -Math.round(w.totalOut),
    kapanis: Math.round(w.closing),
  }));

  const minClosing = Math.min(...result.weeks.map((w) => w.closing));
  const negativeWeeks = result.weeks.filter((w) => w.closing < 0);

  return (
    <section className="panel">
      <h2>13 Haftalık Nakit Projeksiyonu</h2>

      {negativeWeeks.length > 0 ? (
        <p className="panel__note panel__note--bad">
          🔴 {negativeWeeks.length} haftada nakit açığı görünüyor — en düşük kapanış{' '}
          <strong>{formatTRY(minClosing)} ₺</strong> ({shortDate(negativeWeeks[0]!.start)} haftası).
        </p>
      ) : (
        <p className="panel__note panel__note--good">
          🟢 Ufuk boyunca kapanış bakiyesi pozitif kalıyor (en düşük {formatTRY(minClosing)} ₺).
        </p>
      )}

      <div className="chart">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v: number) => formatTRY(v)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip
              formatter={(v: number, name) => [`${formatTRY(Math.abs(v))} ₺`, name]}
              labelFormatter={(l) => `${l} haftası`}
            />
            <ReferenceLine y={0} stroke="var(--fg-muted)" />
            <Bar dataKey="giris" name="Giriş" fill="var(--in)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cikis" name="Çıkış" fill="var(--out)" radius={[0, 0, 3, 3]} />
            <Line
              dataKey="kapanis"
              name="Kapanış bakiyesi"
              stroke="var(--line)"
              strokeWidth={2.5}
              dot={{ r: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="table-wrap">
        <table className="proj">
          <thead>
            <tr>
              <th>Hafta</th>
              <th>Açılış</th>
              <th>Giriş</th>
              <th>Çıkış</th>
              <th>Net</th>
              <th>Kapanış</th>
            </tr>
          </thead>
          <tbody>
            {result.weeks.map((w) => (
              <tr key={w.key} className={w.closing < 0 ? 'row--neg' : ''}>
                <td>
                  {w.key}
                  <span className="muted"> · {shortDate(w.start)}</span>
                </td>
                <td className="num">{formatTRY(w.opening)}</td>
                <td className="num pos">{w.totalIn ? formatTRY(w.totalIn) : '—'}</td>
                <td className="num neg">{w.totalOut ? formatTRY(w.totalOut) : '—'}</td>
                <td className={`num ${w.net < 0 ? 'neg' : 'pos'}`}>{formatTRY(w.net)}</td>
                <td className={`num strong ${w.closing < 0 ? 'neg' : ''}`}>{formatTRY(w.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(result.beyondHorizon.in > 0 || result.beyondHorizon.out > 0 || result.undated.in > 0 || result.undated.out > 0) && (
        <p className="panel__hint">
          Ufuk dışı (13 hafta sonrası): giriş {formatTRY(result.beyondHorizon.in)} ₺, çıkış{' '}
          {formatTRY(result.beyondHorizon.out)} ₺. Vadesi türetilemeyen: giriş{' '}
          {formatTRY(result.undated.in)} ₺, çıkış {formatTRY(result.undated.out)} ₺.
        </p>
      )}
    </section>
  );
}
