/** Shared form helpers for calculator islands (display + input parsing). */

/** Display formatting only (NOT calculation): 6 sig figs, trailing zeros dropped. */
export function formatNumber(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Blank field -> undefined; otherwise a number (NaN for unparseable text, which
 * the pure solver then reports as INVALID_NUMBER). Accepts a comma decimal.
 */
export function parseField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  return Number(trimmed.replace(',', '.'));
}
