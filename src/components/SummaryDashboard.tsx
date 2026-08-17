import type { Summary } from '../projection/summary';
import { formatTRY, shortDate, horizonLabel } from '../lib/format';

interface Props {
  s: Summary;
}

function Tile({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: 'in' | 'out' | 'neutral';
  sub?: string;
}) {
  return (
    <div className={`tile tile--${tone ?? 'neutral'}`}>
      <div className="tile__label">{label}</div>
      <div className="tile__value">{value}</div>
      {sub && <div className="tile__sub">{sub}</div>}
    </div>
  );
}

/**
 * Sayfanın en üstündeki özet. En büyük kutu likidite dip noktası: 13 hafta
 * içinde nakdin en aza indiği an — asıl bakılması gereken tek sayı.
 */
export function SummaryDashboard({ s }: Props) {
  const deficit = s.lowestClosing < 0;
  const hl = horizonLabel(s.horizonWeeks);
  return (
    <section className="dash">
      <div className={`hero ${deficit ? 'hero--bad' : 'hero--good'}`}>
        <div className="hero__main">
          <div className="hero__label">{hl} içindeki en düşük nakit noktası</div>
          <div className="hero__value">{formatTRY(s.lowestClosing)} ₺</div>
          <div className="hero__sub">
            {s.lowestWeekStart && <>{shortDate(s.lowestWeekStart)} haftası · </>}
            {deficit
              ? `${s.deficitWeeks} haftada nakit açığı görünüyor — önlem gerekebilir`
              : 'ufuk boyunca nakit pozitif kalıyor'}
          </div>
        </div>
        <div className="hero__badge">{deficit ? '🔴' : '🟢'}</div>
      </div>

      <div className="tiles">
        <Tile label="Açılış nakdi (kasa+banka)" value={`${formatTRY(s.openingBalance)} ₺`} />
        <Tile
          label={`${hl} sonu tahmini`}
          value={`${formatTRY(s.endingBalance)} ₺`}
          tone={s.endingBalance < 0 ? 'out' : 'neutral'}
        />
        <Tile label={`Toplam tahsilat (${hl})`} value={`${formatTRY(s.totalIn)} ₺`} tone="in" />
        <Tile label={`Toplam ödeme (${hl})`} value={`${formatTRY(s.totalOut)} ₺`} tone="out" />
        {s.hasInstruments && (
          <>
            <Tile
              label="Tahsil edilecek çek"
              value={`${formatTRY(s.chequeIn)} ₺`}
              tone="in"
              sub="portföydeki müşteri çekleri"
            />
            <Tile
              label="Ödenecek çek"
              value={`${formatTRY(s.chequeOut)} ₺`}
              tone="out"
              sub="kendi çekleriniz"
            />
          </>
        )}
      </div>
    </section>
  );
}
