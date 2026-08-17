import { useState } from 'react';
import type { ProjectionResult, ScheduledFlow } from '../projection/project';
import { addDays } from '../derive/effectiveDueDate';
import { formatTRY, shortDate } from '../lib/format';

interface Props {
  result: ProjectionResult;
  /** Projeksiyon başlangıcı — varsayılan aralık buradan başlar. */
  asOf: string;
}

type Filter = 'all' | 'in' | 'out';

/**
 * Yaklaşan ödeme ve tahsilatlar — kalem kalem. 12 ay tek listede boğucu
 * olduğundan varsayılan yalnızca önümüzdeki 30 gün; kullanıcı tarih aralığını
 * genişletebilir ya da hazır aralık (30 gün / 90 gün / tümü) seçebilir.
 */
export function UpcomingFlows({ result, asOf }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [from, setFrom] = useState(asOf);
  const [to, setTo] = useState(addDays(asOf, 30));

  const horizonEnd = addDays(result.weeks[result.weeks.length - 1]?.start ?? asOf, 7);

  function preset(days: number | 'all') {
    setFrom(asOf);
    setTo(days === 'all' ? horizonEnd : addDays(asOf, days));
  }
  const activePreset = (days: number | 'all') =>
    from === asOf && to === (days === 'all' ? horizonEnd : addDays(asOf, days));

  const flows = result.flows.filter(
    (f) => (filter === 'all' || f.direction === filter) && f.date >= from && f.date <= to,
  );
  const byWeek = new Map<number, ScheduledFlow[]>();
  for (const f of flows) {
    const arr = byWeek.get(f.weekIndex) ?? [];
    arr.push(f);
    byWeek.set(f.weekIndex, arr);
  }

  const totalIn = flows.filter((f) => f.direction === 'in').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.direction === 'out').reduce((s, f) => s + f.amount, 0);

  return (
    <section className="panel">
      <h2>Yaklaşan Ödemeler ve Tahsilatlar</h2>
      <p className="panel__lead">
        Seçili tarih aralığında vadesi gelen kalemler. Kimden ne bekleniyor, kime ne ödenecek —
        tek tek. Varsayılan: önümüzdeki 30 gün.
      </p>

      <div className="flow-range">
        <div className="flow-presets">
          <button className={`chip ${activePreset(30) ? 'chip--on' : ''}`} onClick={() => preset(30)}>
            30 gün
          </button>
          <button className={`chip ${activePreset(90) ? 'chip--on' : ''}`} onClick={() => preset(90)}>
            90 gün
          </button>
          <button className={`chip ${activePreset('all') ? 'chip--on' : ''}`} onClick={() => preset('all')}>
            Tümü
          </button>
        </div>
        <div className="flow-dates">
          <label>
            Başlangıç <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Bitiş <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="flow-filter">
        <button className={`chip ${filter === 'all' ? 'chip--on' : ''}`} onClick={() => setFilter('all')}>
          Tümü
        </button>
        <button className={`chip chip--in ${filter === 'in' ? 'chip--on' : ''}`} onClick={() => setFilter('in')}>
          Tahsilatlar · {formatTRY(totalIn)} ₺
        </button>
        <button className={`chip chip--out ${filter === 'out' ? 'chip--on' : ''}`} onClick={() => setFilter('out')}>
          Ödemeler · {formatTRY(totalOut)} ₺
        </button>
      </div>

      {flows.length === 0 ? (
        <p className="panel__hint">Seçili aralıkta gösterilecek kalem yok.</p>
      ) : (
        <div className="flows">
          {result.weeks.map((w, i) => {
            const items = byWeek.get(i);
            if (!items || items.length === 0) return null;
            const wIn = items.filter((f) => f.direction === 'in').reduce((s, f) => s + f.amount, 0);
            const wOut = items.filter((f) => f.direction === 'out').reduce((s, f) => s + f.amount, 0);
            const net = wIn - wOut;
            return (
              <div key={w.key} className="flow-week">
                <div className="flow-week__head">
                  <span className="flow-week__label">
                    {w.key} · {shortDate(w.start)} haftası
                  </span>
                  <span className={`flow-week__net ${net < 0 ? 'neg' : 'pos'}`}>net {formatTRY(net)} ₺</span>
                </div>
                <ul className="flow-list">
                  {items.map((f, idx) => (
                    <li key={idx} className="flow-row">
                      <span className="flow-row__date">{shortDate(f.date)}</span>
                      <span className={`flow-row__dot ${f.direction === 'in' ? 'dot-in' : 'dot-out'}`} />
                      <span className="flow-row__party" title={f.label}>
                        {f.label || '—'}
                      </span>
                      <span className={`flow-row__kind ${f.kind === 'cheque' ? 'kind-cheque' : ''}`}>
                        {f.detail}
                      </span>
                      <span className={`flow-row__amount ${f.direction === 'in' ? 'pos' : 'neg'}`}>
                        {f.direction === 'in' ? '+' : '−'}
                        {formatTRY(f.amount)} ₺
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
