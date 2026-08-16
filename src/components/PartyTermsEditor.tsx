import { useState } from 'react';
import type { PartyTerms } from '../derive/effectiveDueDate';
import type { PartyTotal } from '../quality/partyTotals';
import { formatTRY } from '../lib/format';

interface Props {
  parties: PartyTotal[];
  terms: Map<string, PartyTerms>;
  onChange: (code: string, term: PartyTerms | null) => void;
}

/**
 * Cari bazında ödeme vadesi editörü — %97,7 şüpheli vade sorununun çözüm
 * ekranı. Açık tutara göre sıralı; birkaç büyük cariye vade girmek toplamın
 * çoğunu düzeltir. Girilen vade, o carinin faturalarına "fatura tarihi + gün"
 * olarak uygulanır (docs 4.1).
 */
export function PartyTermsEditor({ parties, terms, onChange }: Props) {
  const [limit, setLimit] = useState(15);
  const shown = parties.slice(0, limit);

  return (
    <section className="panel">
      <h2>Cari Vadeleri</h2>
      <p className="panel__lead">
        Logo'da vadesi olmayan cariler için ödeme vadesini (gün) girin. En büyük açık bakiyeler
        üstte — önce onlara vade girmek projeksiyonu en çok düzeltir.
      </p>

      <div className="table-wrap">
        <table className="terms">
          <thead>
            <tr>
              <th>Cari</th>
              <th>Yön</th>
              <th>Açık tutar</th>
              <th>Vadesiz kalem</th>
              <th>Vade (gün)</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const t = terms.get(p.code);
              return (
                <tr key={`${p.code}-${p.direction}`}>
                  <td>
                    <span className="mono">{p.code}</span>
                    {p.name && <span className="muted"> · {p.name}</span>}
                  </td>
                  <td>{p.direction === 'in' ? 'Tahsilat' : 'Ödeme'}</td>
                  <td className="num">{formatTRY(p.openAmount)} ₺</td>
                  <td className="num">
                    {p.needsTermCount}/{p.itemCount}
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="term-input"
                      placeholder="—"
                      value={t?.default_term_days ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(p.code, v === '' ? null : { default_term_days: Number(v) });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {limit < parties.length && (
        <button className="btn-link" onClick={() => setLimit((l) => l + 25)}>
          Daha fazla göster ({parties.length - limit} cari daha)
        </button>
      )}
    </section>
  );
}
