import { useRef } from 'react';
import type { CekSenetResult } from '../adapters/logo/cekSenet';
import type { Instrument } from '../core/instrument';
import { instrumentContribution } from '../adapters/logo/cekSenet';
import { formatTRY } from '../lib/format';

interface Props {
  result: CekSenetResult | null;
  fileName: string;
  busy: boolean;
  error: string | null;
  onFile: (buffer: ArrayBuffer, name: string) => void;
  onClear: () => void;
}

function tally(instruments: Instrument[], dir: 'in' | 'out'): { count: number; amount: number } {
  let count = 0;
  let amount = 0;
  for (const i of instruments) {
    const c = instrumentContribution(i);
    if (c.dir === dir) {
      count += 1;
      amount += i.amount;
    }
  }
  return { count, amount };
}

/**
 * Çek/Senet raporu — isteğe bağlı ikinci dosya. Yüklenince tahsil edilecek
 * (portföydeki müşteri çekleri) ve ödenecek (kendi çekler) tutarlar projeksiyona
 * eklenir; teminat/ciro/karşılıksız olanlar ayrılır.
 */
export function ChequePanel({ result, fileName, busy, error, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    onFile(await file.arrayBuffer(), file.name);
  }

  const inTally = result ? tally(result.instruments, 'in') : null;
  const outTally = result ? tally(result.instruments, 'out') : null;
  const excludedTotal = result ? result.excluded.reduce((s, e) => s + e.amount, 0) : 0;

  return (
    <section className="panel">
      <h2>Çek / Senet Portföyü <span className="badge-opt">isteğe bağlı</span></h2>
      <p className="panel__lead">
        Çek/senet nakit akışını doğrudan değiştirir: <strong>portföydeki müşteri çekleri</strong>{' '}
        vade tarihinde girişe, <strong>kendi çekleriniz</strong> çıkışa eklenir.{' '}
        <strong>Teminattaki</strong> ve <strong>ciro edilen</strong> çekler nakit sayılmaz — para
        getirmezler. Bu raporu eklemeden projeksiyon yalnızca fatura kalemlerini gösterir.
      </p>

      {!result && (
        <div
          className="drop drop--compact"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handle(e.dataTransfer.files[0]);
          }}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => void handle(e.target.files?.[0])}
          />
          <span className="drop__icon drop__icon--sm">🧾</span>
          <span>{busy ? 'Okunuyor…' : 'Çek/Senet Raporu (.xlsx) ekleyin'}</span>
          <span className="drop__hint">
            Logo → Finans → Çek/Senet Raporları · dosya tarayıcınızdan çıkmaz
          </span>
          {error && <span className="drop__error">{error}</span>}
        </div>
      )}

      {result && inTally && outTally && (
        <>
          <div className="tiles tiles--compact">
            <div className="tile tile--in">
              <div className="tile__label">Tahsil edilecek çek</div>
              <div className="tile__value">{formatTRY(inTally.amount)} ₺</div>
              <div className="tile__sub">{inTally.count} adet · girişe eklendi</div>
            </div>
            <div className="tile tile--out">
              <div className="tile__label">Ödenecek çek</div>
              <div className="tile__value">{formatTRY(outTally.amount)} ₺</div>
              <div className="tile__sub">{outTally.count} adet · çıkışa eklendi</div>
            </div>
            <div className="tile tile--neutral">
              <div className="tile__label">Nakit sayılmayan</div>
              <div className="tile__value">{formatTRY(excludedTotal)} ₺</div>
              <div className="tile__sub">{result.excluded.length} adet · teminat/ciro/karşılıksız</div>
            </div>
          </div>
          <p className="filemeta">
            <strong>{fileName}</strong> · {result.instruments.length} çek/senet ·{' '}
            <button className="btn-link" onClick={onClear}>
              kaldır
            </button>
          </p>
        </>
      )}
    </section>
  );
}
