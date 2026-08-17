import type { AccountKind, CashAccount } from '../core/cashPosition';
import { availableCash, restrictedCash } from '../core/cashPosition';
import { formatTRY } from '../lib/format';

interface Props {
  accounts: CashAccount[];
  onChange: (accounts: CashAccount[]) => void;
  /** Projeksiyonun başlangıç tarihi (ISO) — açılış = bir önceki gece kapanışı. */
  asOf: string;
}

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function prevDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Açılış nakit pozisyonu editörü. Kasa + banka hesapları ayrı satırlar;
 * bloke olanlar işaretlenir ve toplamdan düşülür. Kullanılabilir toplam
 * projeksiyonun açılış bakiyesini besler (docs 3.8).
 */
export function OpeningPosition({ accounts, onChange, asOf }: Props) {
  function update(id: string, patch: Partial<CashAccount>) {
    onChange(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function add(kind: AccountKind) {
    onChange([
      ...accounts,
      {
        id: crypto.randomUUID(),
        kind,
        name: kind === 'cash' ? 'Kasa' : 'Banka hesabı',
        balance: 0,
        restricted: false,
      },
    ]);
  }
  function remove(id: string) {
    onChange(accounts.filter((a) => a.id !== id));
  }

  const available = availableCash(accounts);
  const restricted = restrictedCash(accounts);

  return (
    <section className="panel">
      <h2>Açılış Nakit Pozisyonu</h2>
      <p className="panel__lead">
        Projeksiyon buradan başlar: bugünün açılışı = bir önceki gece kapanışındaki{' '}
        <strong>kasa + banka</strong> bakiyelerinin toplamı. Bloke/teminattaki hesapları
        işaretleyin — kullanılabilir nakde dahil edilmezler.
      </p>
      <p className="panel__note panel__note--info">
        📅 <strong>{longDate(asOf)}</strong> açılışı = <strong>{longDate(prevDay(asOf))}</strong>{' '}
        gece kapanışındaki banka + kasa bakiyeleri. Aşağıya o rakamları girin.
      </p>

      <div className="table-wrap">
        <table className="accounts">
          <thead>
            <tr>
              <th>Tür</th>
              <th>Hesap</th>
              <th>Bakiye (₺)</th>
              <th>Bloke</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className={a.restricted ? 'row--muted' : ''}>
                <td>
                  <select
                    className="acc-kind"
                    value={a.kind}
                    onChange={(e) => update(a.id, { kind: e.target.value as AccountKind })}
                  >
                    <option value="cash">Kasa</option>
                    <option value="bank">Banka</option>
                  </select>
                </td>
                <td>
                  <input
                    className="acc-name"
                    value={a.name}
                    onChange={(e) => update(a.id, { name: e.target.value })}
                    placeholder="Hesap adı"
                  />
                </td>
                <td className="num">
                  <input
                    type="number"
                    className="acc-balance"
                    value={a.balance}
                    onChange={(e) => update(a.id, { balance: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={a.restricted}
                    onChange={(e) => update(a.id, { restricted: e.target.checked })}
                    title="Bloke / teminat — kullanılabilir nakde dahil değil"
                  />
                </td>
                <td>
                  <button className="acc-del" onClick={() => remove(a.id)} title="Sil">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="acc-actions">
        <button className="btn btn--sm" onClick={() => add('cash')}>
          + Kasa
        </button>
        <button className="btn btn--sm" onClick={() => add('bank')}>
          + Banka hesabı
        </button>
      </div>

      <div className="acc-total">
        <div>
          <span className="acc-total__label">Kullanılabilir açılış nakdi</span>
          <span className="acc-total__value">{formatTRY(available)} ₺</span>
        </div>
        {restricted > 0 && (
          <div className="acc-total__restricted">
            Bloke/teminat (dahil değil): {formatTRY(restricted)} ₺
          </div>
        )}
      </div>
    </section>
  );
}
