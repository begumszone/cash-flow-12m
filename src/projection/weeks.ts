/**
 * ISO hafta yardımcıları (docs 4.4). Hafta Pazartesi başlar, anahtar
 * "YYYY-Www" (ör. 2026-W33). Tüm hesap UTC — yerel saat kayması olmasın.
 */

export interface WeekSlot {
  /** "2026-W33" */
  key: string;
  /** Haftanın Pazartesi'si, ISO "YYYY-MM-DD". */
  start: string;
}

/** Verilen tarihin içinde bulunduğu ISO haftasının Pazartesi'si. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Paz .. 6=Cmt
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** ISO 8601 hafta anahtarı — yıl sınırını Perşembe kuralıyla çözer. */
export function isoWeekKey(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // 0=Pzt .. 6=Paz
  d.setUTCDate(d.getUTCDate() - day + 3); // bu haftanın Perşembesi
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const ftDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** asOf tarihinden başlayan n haftalık ufuk (ilk hafta, asOf'un haftası). */
export function horizonWeeks(asOfIso: string, n: number): WeekSlot[] {
  const start = mondayOf(asOfIso);
  const slots: WeekSlot[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * 7);
    const iso = d.toISOString().slice(0, 10);
    slots.push({ key: isoWeekKey(iso), start: iso });
  }
  return slots;
}

/**
 * Bir tarihin ufuk içindeki hafta indeksi. Ufuk başından önce (vadesi geçmiş)
 * ise 0'a düşürülür — ödenmemiş geçmiş borç ilk hafta beklenir. Ufuk dışına
 * düşerse null (ayrı sayılır, projeksiyona girmez).
 */
export function weekIndexOf(dateIso: string, asOfIso: string, n: number): number | null {
  const startMon = new Date(`${mondayOf(asOfIso)}T00:00:00Z`).getTime();
  const itemMon = new Date(`${mondayOf(dateIso)}T00:00:00Z`).getTime();
  const idx = Math.round((itemMon - startMon) / (7 * 86_400_000));
  if (idx < 0) return 0;
  if (idx >= n) return null;
  return idx;
}
