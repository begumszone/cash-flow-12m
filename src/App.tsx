import { useMemo, useState } from 'react';
import { readBorcTakipWorkbook, readCekSenetWorkbook } from './adapters/logo/readWorkbook';
import { adaptBorcTakip, type BorcTakipRow } from './adapters/logo/borcTakip';
import { adaptCekSenet, type CekSenetRow, type CekSenetResult } from './adapters/logo/cekSenet';
import { assessQuality } from './quality/assess';
import { partyTotals } from './quality/partyTotals';
import { project, type Scenario } from './projection/project';
import { buildSummary } from './projection/summary';
import type { PartyTerms } from './derive/effectiveDueDate';
import { availableCash, type CashAccount } from './core/cashPosition';
import { FileDrop } from './components/FileDrop';
import { OpeningPosition } from './components/OpeningPosition';
import { SummaryDashboard } from './components/SummaryDashboard';
import { DataQualityPanel } from './components/DataQualityPanel';
import { ProjectionView } from './components/ProjectionView';
import { UpcomingFlows } from './components/UpcomingFlows';
import { PartyTermsEditor } from './components/PartyTermsEditor';
import { CategoryEditor } from './components/CategoryEditor';
import type { CashCategory } from './core/category';
import { ChequePanel } from './components/ChequePanel';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { ExportDialog } from './components/ExportDialog';
import { buildCsv, type ExportSections } from './lib/exportCsv';
import { saveTextFile } from './lib/saveFile';
import { formatTRY, todayIso } from './lib/format';

const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40 MB — makul üst sınır

const EXPORT_ERRORS: Record<string, string> = {
  declined: 'İndirme iptal edildi.',
  extension_not_enabled: 'Bu ortamda CSV indirme kapalı. Uygulamayı bilgisayarınızda çalıştırırsanız Excel dosyası iner.',
  too_large: 'Dosya çok büyük.',
  rate_limited: 'Az önce bir indirme başlatıldı; birkaç saniye sonra tekrar deneyin.',
};

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

  const [cekRows, setCekRows] = useState<CekSenetRow[] | null>(null);
  const [cekFileName, setCekFileName] = useState('');
  const [cekBusy, setCekBusy] = useState(false);
  const [cekError, setCekError] = useState<string | null>(null);

  const [asOf, setAsOf] = useState(todayIso());
  const [accounts, setAccounts] = useState<CashAccount[]>([
    { id: 'kasa', kind: 'cash', name: 'Kasa', balance: 0, restricted: false },
    { id: 'banka', kind: 'bank', name: 'Banka', balance: 0, restricted: false },
  ]);
  const openingBalance = useMemo(() => availableCash(accounts), [accounts]);
  const [defaultTerm, setDefaultTerm] = useState(30);
  const [scenario, setScenario] = useState<Scenario>('base');
  const [horizon, setHorizon] = useState(52); // 12 ay (rolling) varsayılan
  const [terms, setTerms] = useState<Map<string, PartyTerms>>(new Map());
  const [categories, setCategories] = useState<Map<string, CashCategory>>(new Map());
  const [showExec, setShowExec] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  async function handleFile(buffer: ArrayBuffer, name: string) {
    setBusy(true);
    setError(null);
    try {
      if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('Dosya çok büyük (40 MB üstü). Tarih aralığıyla daraltıp .xlsx olarak alın.');
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

  async function handleCekFile(buffer: ArrayBuffer, name: string) {
    setCekBusy(true);
    setCekError(null);
    try {
      if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('Dosya çok büyük (40 MB üstü).');
      const parsed = await readCekSenetWorkbook(buffer);
      if (parsed.length === 0) throw new Error('Çek/senet satırı bulunamadı.');
      setCekRows(parsed);
      setCekFileName(name);
    } catch (e) {
      setCekError(e instanceof Error ? e.message : 'Dosya okunamadı.');
    } finally {
      setCekBusy(false);
    }
  }

  const adapter = useMemo(() => (rows ? adaptBorcTakip(rows) : null), [rows]);
  const cek = useMemo<CekSenetResult | null>(() => (cekRows ? adaptCekSenet(cekRows) : null), [cekRows]);
  const quality = useMemo(() => (adapter ? assessQuality(adapter, asOf) : null), [adapter, asOf]);
  const parties = useMemo(() => (adapter ? partyTotals(adapter.openItems) : []), [adapter]);
  const projection = useMemo(
    () =>
      adapter
        ? project(adapter.openItems, {
            openingBalance,
            asOf,
            horizon,
            scenario,
            terms,
            fallbackTermDays: { in: defaultTerm, out: defaultTerm },
            instruments: cek?.instruments,
            categories,
          })
        : null,
    [adapter, cek, openingBalance, asOf, horizon, scenario, terms, defaultTerm, categories],
  );
  const summary = useMemo(
    () => (projection && adapter ? buildSummary(projection, adapter, cek?.instruments ?? null) : null),
    [projection, adapter, cek],
  );

  function setPartyTerm(code: string, term: PartyTerms | null) {
    setTerms((prev) => {
      const next = new Map(prev);
      if (term === null) next.delete(code);
      else next.set(code, term);
      return next;
    });
  }

  async function doExport(sections: ExportSections) {
    if (!projection || !summary) return;
    const csv = buildCsv(projection, summary, asOf, sections);
    const outcome = await saveTextFile(`nakit-akis-${asOf}.csv`, csv);
    if (outcome.ok) {
      setShowExport(false);
      setExportNote(null);
    } else {
      setExportNote(EXPORT_ERRORS[outcome.error ?? ''] ?? 'İndirme yapılamadı.');
    }
  }

  function setPartyCategory(code: string, category: CashCategory | null) {
    setCategories((prev) => {
      const next = new Map(prev);
      if (category === null) next.delete(code);
      else next.set(code, category);
      return next;
    });
  }

  function reset() {
    setRows(null);
    setFileName('');
    setError(null);
    setCekRows(null);
    setCekFileName('');
    setTerms(new Map());
    setCategories(new Map());
    setAccounts([
      { id: 'kasa', kind: 'cash', name: 'Kasa', balance: 0, restricted: false },
      { id: 'banka', kind: 'bank', name: 'Banka', balance: 0, restricted: false },
    ]);
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>12 Aylık Nakit Akışı</h1>
          <p className="app__sub">
            Logo raporlarından rolling likidite projeksiyonu · veriniz tarayıcınızdan çıkmaz
          </p>
        </div>
        {rows && (
          <div className="app__actions">
            <button className="btn btn--primary" onClick={() => setShowExec(true)}>
              Yönetici Özeti
            </button>
            <button
              className="btn"
              onClick={() => {
                setExportNote(null);
                setShowExport(true);
              }}
            >
              Excel'e Aktar
            </button>
            <button className="btn" onClick={reset}>
              Yeni dosya
            </button>
          </div>
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
              <li>Cari vadelerini girip nakit projeksiyonunu görün (13 hafta / 6 ay / 12 ay).</li>
              <li>İsterseniz Çek/Senet raporunu da ekleyip çekleri projeksiyona katın.</li>
            </ol>
            <p className="intro__privacy">
              🔒 Dosyalar sunucuya <strong>gönderilmez</strong>; tümüyle tarayıcınızda işlenir.
            </p>
          </div>
        </div>
      )}

      {rows && quality && projection && summary && (
        <>
          <SummaryDashboard s={summary} />

          <div className="controls">
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
            <label className="control">
              <span>Ufuk</span>
              <select
                className="ctrl-select"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
              >
                <option value={13}>13 hafta (~3 ay)</option>
                <option value={26}>26 hafta (~6 ay)</option>
                <option value={52}>52 hafta (12 ay)</option>
              </select>
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
            {cek && <> · çek/senet dahil</>}
          </p>

          <OpeningPosition accounts={accounts} onChange={setAccounts} asOf={asOf} />
          <ProjectionView result={projection} />
          <UpcomingFlows result={projection} />
          <ChequePanel
            result={cek}
            fileName={cekFileName}
            busy={cekBusy}
            error={cekError}
            onFile={(b, n) => void handleCekFile(b, n)}
            onClear={() => {
              setCekRows(null);
              setCekFileName('');
            }}
          />
          <DataQualityPanel q={quality} />
          <CategoryEditor parties={parties} categories={categories} onChange={setPartyCategory} />
          <PartyTermsEditor parties={parties} terms={terms} onChange={setPartyTerm} />
        </>
      )}

      {showExec && projection && summary && (
        <ExecutiveSummary
          summary={summary}
          projection={projection}
          asOf={asOf}
          onClose={() => setShowExec(false)}
          onExport={() => {
            setShowExec(false);
            setExportNote(null);
            setShowExport(true);
          }}
        />
      )}

      {showExport && (
        <ExportDialog
          note={exportNote}
          onClose={() => setShowExport(false)}
          onConfirm={(s) => void doExport(s)}
        />
      )}

      <footer className="app__footer">
        Tüm hesaplama tarayıcıda yapılır. Kaynak veri hiçbir sunucuya gönderilmez.
      </footer>
    </div>
  );
}
