import { useEffect, useMemo, useState } from 'react';
import type { ScheduledFlow } from '../projection/project';
import { addDays } from '../derive/effectiveDueDate';
import { formatTRY, shortDate, weekday } from '../lib/format';

interface Props {
  flows: ScheduledFlow[];
  /** Bu defter yalnızca bu yönü gösterir: 'in' = tahsilat, 'out' = ödeme. */
  direction: 'in' | 'out';
  asOf: string;
  horizonEnd: string;
}

interface DayGroup {
  date: string;
  items: ScheduledFlow[];
  total: number;
}

const DAYS_PER_PAGE = 14;

/**
 * Yaklaşan tahsilat/ödemeler — GÜN GÜN özet. 12 aylık tek liste yüzlerce satır
 * olduğundan, her gün tek bir özet satırında toplanır (tarih · N kalem · toplam);
 * satıra tıklayınca o günün faturaları açılır. Uzun aralıklar sayfalanır, böylece
 * finans ekibi kaydırmadan sayfa sayfa gezer.
 */
export function FlowLedger({ flows, direction, asOf, horizonEnd }: Props) {
  const [from, setFrom] = useState(asOf);
  const [to, setTo] = useState(addDays(asOf, 30));
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allOpen, setAllOpen] = useState(false);

  function preset(days: number | 'all') {
    setFrom(asOf);
    setTo(days === 'all' ? horizonEnd : addDays(asOf, days));
  }
  const activePreset = (days: number | 'all') =>
    from === asOf && to === (days === 'all' ? horizonEnd : addDays(asOf, days));

  const days = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const f of flows) {
      if (f.direction !== direction) continue;
      if (f.date < from || f.date > to) continue;
      let g = map.get(f.date);
      if (!g) {
        g = { date: f.date, items: [], total: 0 };
        map.set(f.date, g);
      }
      g.items.push(f);
      g.total += f.amount;
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [flows, direction, from, to]);

  const grandTotal = days.reduce((s, d) => s + d.total, 0);
  const itemCount = days.reduce((s, d) => s + d.items.length, 0);

  const pageCount = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const pageDays = days.slice(safePage * DAYS_PER_PAGE, safePage * DAYS_PER_PAGE + DAYS_PER_PAGE);

  // Aralık değişince ilk sayfaya dön.
  useEffect(() => {
    setPage(0);
  }, [from, to]);

  const isOpen = (date: string) => allOpen || expanded.has(date);
  function toggle(date: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const label = direction === 'in' ? 'Gelecek Tahsilatlar' : 'Gönderilecek Ödemeler';
  const lead =
    direction === 'in'
      ? 'Vadesi gelen tahsilatlar — gün gün. Her gün tek satır; satıra tıklayın, o günün faturaları açılsın.'
      : 'Vadesi gelen ödemeler — gün gün. Her gün tek satır; satıra tıklayın, o günün faturaları açılsın.';
  const sign = direction === 'in' ? '+' : '−';
  const tone = direction === 'in' ? 'pos' : 'neg';

  return (
    <section className="panel">
      <div className="panel__head">
        <h2>{label}</h2>
        <span className={`ledger-total ${tone}`}>
          {sign}
          {formatTRY(grandTotal)} ₺
          <span className="ledger-total__sub"> · {itemCount.toLocaleString('tr-TR')} kalem</span>
        </span>
      </div>
      <p className="panel__lead">{lead}</p>

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

      {days.length === 0 ? (
        <p className="panel__hint">Seçili aralıkta gösterilecek kalem yok.</p>
      ) : (
        <>
          <div className="ledger-bar">
            <button className="btn-link" onClick={() => setAllOpen((v) => !v)}>
              {allOpen ? 'Tümünü kapat' : 'Tümünü aç'}
            </button>
            {pageCount > 1 && (
              <Pager page={safePage} pageCount={pageCount} onGo={setPage} />
            )}
          </div>

          <ul className="ledger">
            {pageDays.map((g) => (
              <li key={g.date} className={`ledger-day ${isOpen(g.date) ? 'is-open' : ''}`}>
                <button className="ledger-day__head" onClick={() => toggle(g.date)}>
                  <span className="ledger-day__caret">{isOpen(g.date) ? '▾' : '▸'}</span>
                  <span className="ledger-day__date">
                    {shortDate(g.date)} <span className="muted">{weekday(g.date)}</span>
                  </span>
                  <span className="ledger-day__count">{g.items.length} kalem</span>
                  <span className={`ledger-day__total ${tone}`}>
                    {sign}
                    {formatTRY(g.total)} ₺
                  </span>
                </button>
                {isOpen(g.date) && (
                  <ul className="ledger-items">
                    {g.items.map((f, idx) => (
                      <li key={idx} className="ledger-item">
                        <span className="ledger-item__party" title={f.label}>
                          {f.label || '—'}
                        </span>
                        <span className={`ledger-item__kind ${f.kind === 'cheque' ? 'kind-cheque' : ''}`}>
                          {f.detail}
                        </span>
                        <span className={`ledger-item__amt ${tone}`}>
                          {sign}
                          {formatTRY(f.amount)} ₺
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="ledger-bar ledger-bar--foot">
              <span className="muted">
                {days.length.toLocaleString('tr-TR')} gün · {itemCount.toLocaleString('tr-TR')} kalem
              </span>
              <Pager page={safePage} pageCount={pageCount} onGo={setPage} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Pager({ page, pageCount, onGo }: { page: number; pageCount: number; onGo: (p: number) => void }) {
  return (
    <div className="pager">
      <button className="pager__btn" disabled={page === 0} onClick={() => onGo(0)} aria-label="İlk sayfa">
        «
      </button>
      <button className="pager__btn" disabled={page === 0} onClick={() => onGo(page - 1)} aria-label="Önceki">
        ‹
      </button>
      <span className="pager__label">
        Sayfa {page + 1} / {pageCount}
      </span>
      <button
        className="pager__btn"
        disabled={page >= pageCount - 1}
        onClick={() => onGo(page + 1)}
        aria-label="Sonraki"
      >
        ›
      </button>
      <button
        className="pager__btn"
        disabled={page >= pageCount - 1}
        onClick={() => onGo(pageCount - 1)}
        aria-label="Son sayfa"
      >
        »
      </button>
    </div>
  );
}
