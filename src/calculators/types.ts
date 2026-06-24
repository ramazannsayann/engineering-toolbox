/**
 * Shared calculator contract types.
 *
 * Every calculator module imports from here so all 40+ tools share one shape:
 *  - `Calculator` — registry/listing/SEO metadata ONLY (never calculation logic).
 *  - `CalcResult<T>` — the discriminated-union result returned by every solve fn.
 *
 * This file is pure types + one tiny helper. It imports nothing from React,
 * Astro, the DOM, or any calculator module — keep it that way.
 */

/**
 * Metadata describing a single calculator. Lives in the registry; holds no math.
 *
 * All fields are `readonly`: the registry shares a single object per tool across
 * the whole app, so the compiler enforces that callers treat metadata as
 * immutable (no field reassignment, no array mutation).
 */
export interface Calculator {
  /** Stable internal id, e.g. "ohms-law". */
  readonly id: string;
  /** URL slug (Turkish), e.g. "ohm-yasasi-hesaplayici". */
  readonly slug: string;
  /** Category id — must match an id in src/data/categories.ts (e.g. "electrical"). */
  readonly categoryId: string;
  /** Turkish display title. */
  readonly title: string;
  /** Turkish one-line description (used later for meta descriptions). */
  readonly description: string;
  /** Short display formula(s), e.g. "V = I × R · P = V × I". */
  readonly formula: string;
  /** Turkish SEO keywords. */
  readonly keywords: readonly string[];
  /** Related calculator IDs (may reference tools that don't exist yet). */
  readonly relatedTools: readonly string[];
  /**
   * Optional FAQ pairs. Feeds BOTH the visible FAQ section AND the FAQPage
   * JSON-LD on the tool page. Kept `readonly` per the shared immutability rule.
   */
  readonly faq?: readonly { readonly question: string; readonly answer: string }[];
}

/** Structured error returned by a failed calculation. Never thrown. */
export interface CalcError {
  /** Stable, machine-readable code, e.g. "INSUFFICIENT_VALUES". */
  readonly code: string;
  /** Human-readable, user-facing message (Turkish). */
  readonly message: string;
}

/**
 * Result returned by every calculator's pure solve function.
 *
 * Discriminated on `ok`: on success the payload `T` is merged in alongside
 * `ok: true`; on failure a structured `error` is returned instead. Solve
 * functions NEVER throw — they always return one of these two shapes.
 *
 * `ok` is the discriminant and `error` belongs only to the failure arm, so the
 * success arm strips any `ok`/`error` keys from the payload (`Omit<T, …>`).
 * A payload type therefore can never shadow the discriminant or make `error`
 * appear on success — keeping `if (result.ok)` narrowing reliable as the
 * contract is copied across 40+ calculators. (Payloads simply should not use
 * those reserved names.)
 */
export type CalcResult<T extends object> =
  | ({ ok: true } & Omit<T, 'ok' | 'error'>)
  | { ok: false; error: CalcError };

/** Build a failure result. Reusable across every calculator. */
export function fail<T extends object>(
  code: string,
  message: string,
): CalcResult<T> {
  return { ok: false, error: { code, message } };
}
