import { useState } from 'react';
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
import { monthlyRollup } from '../projection/monthly';
import { formatTRY, shortDate, horizonLabel } from '../lib/format';

interface Props {
  result: ProjectionResult;
}

/** Ortak satır tipi: hem hafta hem ay aynı biçimde çizilebilsin. */
interface Period {
  key: string;
  label: string;
  opening: number;
  totalIn: number;
  totalOut: number;
  net: number;
  closing: number;
}

type View = 'weekly' | 'monthly';

/** Nakit projeksiyonu — haftalık ya da aylık; uzun ufukta aylık daha okunur. */
export function ProjectionView({ result }: Props) {
  // Uzun ufukta (>16 hafta ≈ 4 ay) varsayılan aylık.
  const [view, setView] = useState<View>(result.weeks.length > 16 ? 'monthly' : 'weekly');

  const periods: Period[] =
    view === 'monthly'
      ? monthlyRollup(result.weeks)
      : result.weeks.map((w) => ({
          key: w.key,
          label: `${w.key} · ${shortDate(w.start)}`,
          opening: w.opening,
          totalIn: w.totalIn,
          totalOut: w.totalOut,
          net: w.net,
          closing: w.closing,
        }));

  const chartData = periods.map((p) => ({
    label: view === 'monthly' ? p.label : shortDate(p.key.length >= 10 ? p.key : p.key),
    xlabel: view === 'monthly' ? p.label : p.label.split(' · ')[1] ?? p.label,
    giris: Math.round(p.totalIn),
    cikis: -Math.round(p.totalOut),
    kapanis: Math.round(p.closing),
  }));

  const lowest = periods.reduce((lo, p) => (p.closing < lo.closing ? p : lo), periods[0]!);
  const negatives = periods.filter((p) => p.closing < 0);
  const unit = view === 'monthly' ? 'ay' : 'hafta';
  const colHead = view === 'monthly' ? 'Ay' : 'Hafta';

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{horizonLabel(result.weeks.length)} Nakit Projeksiyonu</h2>
        <div className="seg">
          <button className={`seg__btn ${view === 'monthly' ? 'seg__btn--on' : ''}`} onClick={() => setView('monthly')}>
            Aylık
          </button>
          <button className={`seg__btn ${view === 'weekly' ? 'seg__btn--on' : ''}`} onClick={() => setView('weekly')}>
            Haftalık
          </button>
        </div>
      </div>

      {negatives.length > 0 ? (
        <p className="panel__note panel__note--bad">
          🔴 {negatives.length} {unit}da nakit açığı görünüyor — en düşük kapanış{' '}
          <strong>{formatTRY(lowest.closing)} ₺</strong> ({lowest.label.split(' · ')[0]}).
        </p>
      ) : (
        <p className="panel__note panel__note--good">
          🟢 Ufuk boyunca kapanış bakiyesi pozitif kalıyor (en düşük {formatTRY(lowest.closing)} ₺).
        </p>
      )}

      <div className="chart">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis
              dataKey="xlabel"
              tick={{ fontSize: 11 }}
              interval={chartData.length > 16 ? Math.floor(chartData.length / 13) : 0}
            />
            <YAxis tickFormatter={(v: number) => formatTRY(v)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip
              formatter={(v: number, name) => [`${formatTRY(Math.abs(v))} ₺`, name]}
              labelFormatter={(l) => `${l}`}
            />
            <ReferenceLine y={0} stroke="var(--fg-muted)" />
            <Bar dataKey="giris" name="Giriş" fill="var(--in)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cikis" name="Çıkış" fill="var(--out)" radius={[0, 0, 3, 3]} />
            <Line dataKey="kapanis" name="Kapanış bakiyesi" stroke="var(--line)" strokeWidth={2.5} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="table-wrap">
        <table className="proj">
          <thead>
            <tr>
              <th>{colHead}</th>
              <th>Açılış</th>
              <th>Giriş</th>
              <th>Çıkış</th>
              <th>Net</th>
              <th>Kapanış</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.key} className={p.closing < 0 ? 'row--neg' : ''}>
                <td>{p.label}</td>
                <td className="num">{formatTRY(p.opening)}</td>
                <td className="num pos">{p.totalIn ? formatTRY(p.totalIn) : '—'}</td>
                <td className="num neg">{p.totalOut ? formatTRY(p.totalOut) : '—'}</td>
                <td className={`num ${p.net < 0 ? 'neg' : 'pos'}`}>{formatTRY(p.net)}</td>
                <td className={`num strong ${p.closing < 0 ? 'neg' : ''}`}>{formatTRY(p.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(result.beyondHorizon.in > 0 || result.beyondHorizon.out > 0 || result.undated.in > 0 || result.undated.out > 0) && (
        <p className="panel__hint">
          Ufuk dışı ({horizonLabel(result.weeks.length)} sonrası): giriş {formatTRY(result.beyondHorizon.in)} ₺, çıkış{' '}
          {formatTRY(result.beyondHorizon.out)} ₺. Vadesi türetilemeyen: giriş {formatTRY(result.undated.in)} ₺, çıkış{' '}
          {formatTRY(result.undated.out)} ₺.
        </p>
      )}
    </section>
  );
}
