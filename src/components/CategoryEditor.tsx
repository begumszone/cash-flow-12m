import { useState } from 'react';
import type { PartyTotal } from '../quality/partyTotals';
import type { CashCategory } from '../core/category';
import { categoriesFor } from '../core/category';
import { formatTRY } from '../lib/format';

interface Props {
  parties: PartyTotal[];
  categories: Map<string, CashCategory>;
  onChange: (code: string, category: CashCategory | null) => void;
}

/**
 * Cari → gelir/gider kategorisi ataması. Ödemelerin türünü (vergi, maaş, stok…)
 * belirler. En büyük bakiyeler üstte — önce onları kategorilemek en çok işe yarar.
 * İdeali Logo'daki masraf merkezi/proje kodu; o gelene kadar elle atanır.
 */
export function CategoryEditor({ parties, categories, onChange }: Props) {
  const [limit, setLimit] = useState(15);
  const shown = parties.slice(0, limit);

  return (
    <section className="panel">
      <h2>Cari Kategorileri</h2>
      <p className="panel__lead">
        Her cariyi bir gelir/gider türüne bağlayın — böylece "para nereye gidiyor" (vergi, maaş,
        stok, kira…) görünür olur. Atanmayanlar İşlem Türü'nden tahmin edilir.
      </p>

      <div className="table-wrap">
        <table className="terms">
          <thead>
            <tr>
              <th>Cari</th>
              <th>Yön</th>
              <th>Açık tutar</th>
              <th>Kategori</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const opts = categoriesFor(p.direction);
              return (
                <tr key={`${p.code}-${p.direction}`}>
                  <td>
                    <span className="mono">{p.code}</span>
                    {p.name && <span className="muted"> · {p.name}</span>}
                  </td>
                  <td>{p.direction === 'in' ? 'Tahsilat' : 'Ödeme'}</td>
                  <td className="num">{formatTRY(p.openAmount)} ₺</td>
                  <td>
                    <select
                      className="cat-select"
                      value={categories.get(p.code) ?? ''}
                      onChange={(e) => onChange(p.code, (e.target.value || null) as CashCategory | null)}
                    >
                      <option value="">otomatik</option>
                      {opts.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
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
