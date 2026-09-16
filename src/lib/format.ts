/** TL biçimleme ve tarih yardımcıları — TR yerel biçim. */

export function formatTRY(n: number, withDecimals = false): string {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
}

/** "2026-08-17" -> "17 Ağu" */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** "2026-08-17" -> "17 Ağustos 2026" */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "2026-08-17" -> "Pzt" (kısa gün adı). */
export function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Hafta sayısını okunur ufuk etiketine çevirir: 52 → "12 ay", 13 → "13 hafta". */
export function horizonLabel(weeks: number): string {
  if (weeks % 52 === 0) return `${weeks / 52 * 12} ay`;
  if (weeks % 4 === 0 && weeks >= 24) return `${weeks / 4} ay`;
  if (weeks === 26) return '6 ay';
  return `${weeks} hafta`;
}
