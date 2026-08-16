import type { Direction, DueDateQuality } from '../core/openItem';

/**
 * Etkin vade türetmesi (docs bölüm 4.1).
 *
 * İlk gerçek ölçümde açık kalemlerin %97,7'sinde vade = fatura tarihiydi
 * (şüpheli), yani ERP'nin vadesi kullanılamaz. Bu katman gerçek vadeyi bir
 * öncelik zincirinden türetir; hiçbir yerde sessizce 1 gün/bugün varsaymaz,
 * türetilen ile güvenilir olanı ayrı işaretler.
 *
 * Öncelik:
 *   1. Manuel override → o (kaynak: override)
 *   2. ERP vadesi GÜVENİLİR ise → ERP vadesi (kaynak: erp)
 *   3. Cari'nin `default_term_days`'i varsa → fatura tarihi + vade (kaynak: party-term)
 *   4. Hiçbiri yoksa → tür bazlı varsayılan + "assumed" işareti (kaynak: assumed)
 *
 * Tahsilat (giriş) tarafında ayrıca gecikme uygulanır:
 *   projected_date = due_date_effective + party.avg_delay_days
 * Ödeme (çıkış) tarafında gecikme UYGULANMAZ — kendi ödemeni geciktirmek plan
 * değil senaryo meselesidir (4.1).
 */

export interface PartyTerms {
  /** Cari bazında ödeme vadesi (gün). Sözleşme/elle — ERP değil. */
  default_term_days?: number | null;
  /** Gerçekleşen ortalama gecikme (gün); yalnızca giriş tarafına uygulanır. */
  avg_delay_days?: number | null;
}

export type DueSource = 'override' | 'erp' | 'party-term' | 'assumed';

export interface EffectiveDueInput {
  party_code: string;
  direction: Direction;
  doc_date: string | null;
  due_date: string | null;
  due_date_quality: DueDateQuality;
}

export interface EffectiveDueResult {
  due_date_effective: string | null;
  due_source: DueSource;
  /** Giriş tarafında gecikme eklenmiş tarih; çıkışta due_date_effective ile aynı. */
  projected_date: string | null;
  /** Türetilen tarihin güveni: erp=reliable, party-term/override=derived, aksi=assumed. */
  confidence: 'reliable' | 'derived' | 'assumed';
}

export interface DeriveOptions {
  /** party_code → manuel override edilmiş ISO vade. */
  overrides?: Map<string, string>;
  /** party_code → cari vade/gecikme. */
  terms?: Map<string, PartyTerms>;
  /** Cari vadesi de yoksa kullanılacak son çare (gün). Yön bazlı. */
  fallbackTermDays?: { in: number; out: number };
}

const DEFAULT_FALLBACK = { in: 30, out: 30 };

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function deriveEffectiveDueDate(
  item: EffectiveDueInput,
  opts: DeriveOptions = {},
): EffectiveDueResult {
  const overrides = opts.overrides ?? new Map();
  const terms = opts.terms ?? new Map();
  const fallback = opts.fallbackTermDays ?? DEFAULT_FALLBACK;
  const partyTerm = terms.get(item.party_code);

  let effective: string | null;
  let source: DueSource;
  let confidence: EffectiveDueResult['confidence'];

  const override = overrides.get(item.party_code);
  if (override) {
    effective = override;
    source = 'override';
    confidence = 'derived';
  } else if (item.due_date_quality === 'reliable' && item.due_date) {
    effective = item.due_date;
    source = 'erp';
    confidence = 'reliable';
  } else if (partyTerm?.default_term_days != null && item.doc_date) {
    effective = addDays(item.doc_date, partyTerm.default_term_days);
    source = 'party-term';
    confidence = 'derived';
  } else if (item.doc_date) {
    effective = addDays(item.doc_date, fallback[item.direction]);
    source = 'assumed';
    confidence = 'assumed';
  } else {
    // Fatura tarihi bile yoksa türetilecek dayanak yok.
    effective = null;
    source = 'assumed';
    confidence = 'assumed';
  }

  // Tahsilat gecikmesi yalnızca giriş tarafında.
  let projected = effective;
  if (effective && item.direction === 'in' && partyTerm?.avg_delay_days) {
    projected = addDays(effective, Math.round(partyTerm.avg_delay_days));
  }

  return { due_date_effective: effective, due_source: source, projected_date: projected, confidence };
}
