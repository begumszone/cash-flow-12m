import type { OpenItem, DueDateQuality } from '../../core/openItem';
import { classifyIslemTuru } from './islemTuru';

/**
 * Logo Tiger 3 "Borç Takip Raporu" export'unun bir satırı, konumsal grid'den
 * isimli alanlara çözülmüş hali. Rapor çift bloklu (sol = postalanan hareket,
 * sağ = onun kapattığı eski kalem); adaptörün ihtiyacı olan alanlar burada.
 * Tarihler ISO "YYYY-MM-DD" ya da null (okuyucu Excel tarihini çevirir).
 */
export interface BorcTakipRow {
  /** "kod / ad" tek hücrede. */
  cariHesap: string;
  vadeTarihi: string | null;
  islemTarihi: string | null;
  belgeNo: string;
  islemTuru: string;
  borc: number;
  alacak: number;
  /** Sağ blok: bu satırın kapattığı belgenin no'su ve kapama tutarı. */
  kapananBelgeNo: string;
  kapananTutar: number;
}

export type ExclusionReason =
  | 'cash-movement'
  | 'adjustment'
  | 'opening'
  | 'unknown-type'
  | 'fully-closed'
  | 'zero-amount';

export interface ExcludedRow {
  reason: ExclusionReason;
  islemTuru: string;
  direction: 'in' | 'out' | null;
  amount: number;
}

export interface AdapterResult {
  openItems: OpenItem[];
  excluded: ExcludedRow[];
}

const EPSILON = 0.01;

/** "120.01.045 / Örnek Ticaret Ltd." -> { code, name }. Ayraç yoksa hepsi koda gider. */
export function splitCariHesap(cari: string): { code: string; name: string } {
  const idx = cari.indexOf(' / ');
  if (idx === -1) return { code: cari.trim(), name: '' };
  return { code: cari.slice(0, idx).trim(), name: cari.slice(idx + 3).trim() };
}

function dueDateQuality(due: string | null, doc: string | null): DueDateQuality {
  if (!due) return 'missing';
  // Kritik kural (3.2): vade == fatura tarihi ise Logo çoğu zaman ödeme planı
  // bağlı olmadığı için vadeyi doldurmuş demektir — şüpheli, varsayılmaz.
  if (doc && due === doc) return 'suspect';
  return 'reliable';
}

/**
 * Belge no gerçek bir fiş numarasına benziyor mu? Logo fiş no'ları harf+rakam,
 * boşluksuz olur (ORN2024000000001, ORN2026000000001, 000123). Boşluk içeren
 * ya da serbest metin görünenler (açıklamanın belge no alanına düşmesi) açık
 * kalem eşleştirmesini güvenilmez kılar; kalem yine üretilir ama kalite
 * panelinde işaretlenir.
 */
export function looksLikeDocNo(belge: string): boolean {
  const b = belge.trim();
  if (b === '') return false;
  return /\d/.test(b) && !/\s/.test(b);
}

/**
 * Borç Takip satırlarını açık `open_item` kalemlerine çevirir.
 *
 * Yaklaşım: yalnızca FATURA türü satırlar açık kalem adayıdır. Her belgenin
 * kapanan kısmı, o belge no'suna eşleşen tüm sağ-blok Kapanan Tutar'larının
 * toplamıdır; kalan (> 0) açık kalemdir. Nakit hareketleri, dekontlar, açılış
 * ve bilinmeyen türler `excluded` içine gerekçesiyle konur — asla sessizce
 * atılmaz (1. bölüm, 4. ilke).
 */
export function adaptBorcTakip(rows: BorcTakipRow[]): AdapterResult {
  // 1) Belge no -> toplam kapanan tutar.
  const closedByDoc = new Map<string, number>();
  for (const r of rows) {
    const key = r.kapananBelgeNo.trim();
    if (key === '' || !r.kapananTutar) continue;
    closedByDoc.set(key, (closedByDoc.get(key) ?? 0) + r.kapananTutar);
  }

  const openItems: OpenItem[] = [];
  const excluded: ExcludedRow[] = [];

  for (const r of rows) {
    const cls = classifyIslemTuru(r.islemTuru);
    const posted = (r.borc || 0) + (r.alacak || 0);

    if (cls.kind !== 'invoice' || cls.direction === null) {
      const reason: ExclusionReason =
        cls.kind === 'cash'
          ? 'cash-movement'
          : cls.kind === 'adjustment'
            ? 'adjustment'
            : cls.kind === 'opening'
              ? 'opening'
              : 'unknown-type';
      excluded.push({ reason, islemTuru: r.islemTuru, direction: null, amount: posted });
      continue;
    }

    const amount = posted * cls.sign;
    if (Math.abs(amount) < EPSILON) {
      excluded.push({ reason: 'zero-amount', islemTuru: r.islemTuru, direction: cls.direction, amount: 0 });
      continue;
    }

    const closed = closedByDoc.get(r.belgeNo.trim()) ?? 0;
    const open = amount - closed;
    if (open <= EPSILON) {
      excluded.push({ reason: 'fully-closed', islemTuru: r.islemTuru, direction: cls.direction, amount });
      continue;
    }

    const { code, name } = splitCariHesap(r.cariHesap);
    openItems.push({
      party_code: code,
      party_name: name,
      direction: cls.direction,
      doc_type: r.islemTuru,
      doc_no: r.belgeNo.trim(),
      doc_date: r.islemTarihi,
      due_date: r.vadeTarihi,
      due_date_quality: dueDateQuality(r.vadeTarihi, r.islemTarihi),
      amount_original: amount,
      closed_amount: closed,
      open_amount: open,
    });
  }

  return { openItems, excluded };
}
