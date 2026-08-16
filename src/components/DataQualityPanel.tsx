import type { QualityReport, CountAmount } from '../quality/assess';
import { formatTRY } from '../lib/format';

interface Props {
  q: QualityReport;
}

function Stat({ label, ca, tone }: { label: string; ca: CountAmount; tone?: 'warn' | 'bad' | 'good' }) {
  return (
    <div className={`stat ${tone ? `stat--${tone}` : ''}`}>
      <div className="stat__amount">{formatTRY(ca.amount)} ₺</div>
      <div className="stat__count">{ca.count.toLocaleString('tr-TR')} kalem</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}

/**
 * Veri Kalitesi Paneli (docs 5). Eksik veriyi gizlemez, rakama çevirir. En
 * kritik satır şüpheli vade: ilk gerçek veride açık kalemlerin %97,7'siydi.
 */
export function DataQualityPanel({ q }: Props) {
  const suspectShare =
    q.openItems.total.count > 0
      ? Math.round((q.dueDate.suspect.count / q.openItems.total.count) * 100)
      : 0;

  return (
    <section className="panel">
      <h2>Veri Kalitesi</h2>
      <p className="panel__lead">
        Bu araç eksik veriyi gizlemez, ölçer. Aşağıdaki sayılar Logo'daki boşluğu gösterir —
        vade güvenilir değilse projeksiyon türetilen vadeye dayanır.
      </p>

      <div className="stat-grid">
        <Stat label="Açık kalem (giriş)" ca={q.openItems.byDirection.in} tone="good" />
        <Stat label="Açık kalem (çıkış)" ca={q.openItems.byDirection.out} />
        <Stat
          label={`Şüpheli vade (vade = fatura tarihi) — %${suspectShare}`}
          ca={q.dueDate.suspect}
          tone={suspectShare > 50 ? 'bad' : 'warn'}
        />
        <Stat label="Güvenilir vade" ca={q.dueDate.reliable} tone="good" />
        <Stat label="Eksik vade" ca={q.dueDate.missing} tone={q.dueDate.missing.count ? 'warn' : undefined} />
        <Stat label="Belge no bozuk" ca={q.suspectDocNo} tone={q.suspectDocNo.count ? 'warn' : undefined} />
      </div>

      {suspectShare > 50 && (
        <p className="panel__note">
          ⚠️ Açık kalemlerin %{suspectShare}'inde vade, fatura tarihine eşit — yani Logo'da ödeme
          planı tanımlı değil. Aşağıdaki <strong>Cari Vadeleri</strong> bölümünden vade girerek
          projeksiyonu gerçeğe yaklaştırabilirsiniz.
        </p>
      )}
    </section>
  );
}
