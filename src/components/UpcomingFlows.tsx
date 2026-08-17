import { useState } from 'react';
import type { ProjectionResult, ScheduledFlow } from '../projection/project';
import { formatTRY, shortDate } from '../lib/format';

interface Props {
  result: ProjectionResult;
}

type Filter = 'all' | 'in' | 'out';

/**
 * Yaklaşan ödeme ve tahsilatlar — haftalık toplamların altındaki kalemler.
 * Hafta hafta gruplanır; her kalem tarih, cari, tür ve tutarı gösterir.
 * "Bu hafta kime ne ödeyeceğim, kimden ne bekliyorum" sorusunun cevabı.
 */
export function UpcomingFlows({ result }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const flows = result.flows.filter((f) => filter === 'all' || f.direction === filter);
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
        13 hafta içinde vadesi gelen kalemler, hafta hafta. Kimden ne bekleniyor, kime ne
        ödenecek — tek tek.
      </p>

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
        <p className="panel__hint">Bu ufukta gösterilecek kalem yok.</p>
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
                  <span className={`flow-week__net ${net < 0 ? 'neg' : 'pos'}`}>
                    net {formatTRY(net)} ₺
                  </span>
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
                        {f.kind === 'cheque' ? f.detail : f.detail}
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
