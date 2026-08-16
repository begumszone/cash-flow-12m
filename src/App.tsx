import { useMemo, useState } from 'react';
import { readBorcTakipWorkbook } from './adapters/logo/readWorkbook';
import { adaptBorcTakip, type BorcTakipRow } from './adapters/logo/borcTakip';
import { assessQuality } from './quality/assess';
import { partyTotals } from './quality/partyTotals';
import { project, type Scenario } from './projection/project';
import type { PartyTerms } from './derive/effectiveDueDate';
import { FileDrop } from './components/FileDrop';
import { DataQualityPanel } from './components/DataQualityPanel';
import { ProjectionView } from './components/ProjectionView';
import { PartyTermsEditor } from './components/PartyTermsEditor';
import { formatTRY, todayIso } from './lib/format';

const SCENARIOS: { key: Scenario; label: string; hint: string }[] = [
  { key: 'pessimistic', label: 'Kötümser', hint: 'Tahsilat gecikmeli; belirsiz vadeli girişler hariç' },
  { key: 'base', label: 'Baz', hint: 'Tahsilat gecikmeli; her şey dahil' },
  { key: 'optimistic', label: 'İyimser', hint: 'Tahsilat vadesinde; her şey dahil' },
];

export default function App() {
  const [rows, setRows] = useState<BorcTakipRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [asOf, setAsOf] = useState(todayIso());
  const [openingBalance, setOpeningBalance] = useState(0);
  const [defaultTerm, setDefaultTerm] = useState(30);
  const [scenario, setScenario] = useState<Scenario>('base');
  const [terms, setTerms] = useState<Map<string, PartyTerms>>(new Map());

  async function handleFile(buffer: ArrayBuffer, name: string) {
    setBusy(true);
    setError(null);
    try {
      const parsed = await readBorcTakipWorkbook(buffer);
      if (parsed.length === 0) throw new Error('Dosyada veri satırı bulunamadı. Doğru rapor mu?');
      setRows(parsed);
      setFileName(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dosya okunamadı.');
    } finally {
      setBusy(false);
    }
  }

  const adapter = useMemo(() => (rows ? adaptBorcTakip(rows) : null), [rows]);
  const quality = useMemo(() => (adapter ? assessQuality(adapter, asOf) : null), [adapter, asOf]);
  const parties = useMemo(() => (adapter ? partyTotals(adapter.openItems) : []), [adapter]);
  const projection = useMemo(
    () =>
      adapter
        ? project(adapter.openItems, {
            openingBalance,
            asOf,
            scenario,
            terms,
            fallbackTermDays: { in: defaultTerm, out: defaultTerm },
          })
        : null,
    [adapter, openingBalance, asOf, scenario, terms, defaultTerm],
  );

  function setPartyTerm(code: string, term: PartyTerms | null) {
    setTerms((prev) => {
      const next = new Map(prev);
      if (term === null) next.delete(code);
      else next.set(code, term);
      return next;
    });
  }

  function reset() {
    setRows(null);
    setFileName('');
    setError(null);
    setTerms(new Map());
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>13 Haftalık Nakit Akışı</h1>
          <p className="app__sub">
            Logo Borç Takip Raporu'ndan haftalık likidite projeksiyonu · veriniz tarayıcınızdan
            çıkmaz
          </p>
        </div>
        {rows && (
          <button className="btn" onClick={reset}>
            Yeni dosya
          </button>
        )}
      </header>

      {!rows && (
        <div className="intro">
          <FileDrop onFile={(b, n) => void handleFile(b, n)} busy={busy} error={error} />
          <div className="intro__how">
            <h3>Nasıl çalışır</h3>
            <ol>
              <li>
                Logo'da <strong>Finans → Ödeme/Tahsilat Raporları → Borç Takip Raporu</strong>'nu
                <strong> .xlsx</strong> olarak alın.
              </li>
              <li>Dosyayı buraya bırakın — açık kalemler ve veri kalitesi anında çıkar.</li>
              <li>Cari vadelerini girip 13 haftalık projeksiyonu görün.</li>
            </ol>
            <p className="intro__privacy">
              🔒 Dosya sunucuya <strong>gönderilmez</strong>; tümüyle tarayıcınızda işlenir.
            </p>
          </div>
        </div>
      )}

      {rows && quality && projection && (
        <>
          <div className="controls">
            <label className="control">
              <span>Açılış nakit (₺)</span>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
              />
            </label>
            <label className="control">
              <span>Başlangıç tarihi</span>
              <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            </label>
            <label className="control">
              <span>Varsayılan vade (gün)</span>
              <input
                type="number"
                min={0}
                value={defaultTerm}
                onChange={(e) => setDefaultTerm(Number(e.target.value) || 0)}
              />
            </label>
            <div className="control">
              <span>Senaryo</span>
              <div className="seg">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    className={`seg__btn ${scenario === s.key ? 'seg__btn--on' : ''}`}
                    onClick={() => setScenario(s.key)}
                    title={s.hint}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="filemeta">
            <strong>{fileName}</strong> · {rows.length.toLocaleString('tr-TR')} satır ·{' '}
            {formatTRY(quality.openItems.total.amount)} ₺ açık kalem
          </p>

          <ProjectionView result={projection} />
          <DataQualityPanel q={quality} />
          <PartyTermsEditor parties={parties} terms={terms} onChange={setPartyTerm} />
        </>
      )}

      <footer className="app__footer">
        Tüm hesaplama tarayıcıda yapılır. Kaynak veri hiçbir sunucuya gönderilmez.
      </footer>
    </div>
  );
}
