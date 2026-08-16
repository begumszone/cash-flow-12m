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

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
