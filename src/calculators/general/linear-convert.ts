/**
 * Reusable LINEAR unit-conversion engine — pure, framework-agnostic.
 *
 * "Linear" = each unit is a fixed multiple of a common base (length→m,
 * weight→g, area→m², …). Every such converter shares this engine: define a unit
 * list with `factorToBase`, then call `convertLinear`. Future general converters
 * (weight, area, volume, speed, pressure) reuse this file verbatim.
 *
 * No React/Astro/DOM imports.
 */
import { fail, type CalcResult } from '../types';

export interface LinearUnit {
  /** Stable id used by the UI dropdown and lookups. */
  readonly id: string;
  /** Turkish-friendly label, e.g. "Metre (m)". */
  readonly label: string;
  /** How many BASE units one of this unit equals (e.g. cm → 0.01 m). */
  readonly factorToBase: number;
}

export interface LinearRow {
  readonly label: string;
  readonly value: string;
}

export interface LinearSuccess {
  /** One row per OTHER unit (the source unit is excluded). */
  readonly rows: readonly LinearRow[];
}

export type LinearResult = CalcResult<LinearSuccess>;

export const LINEAR_ERROR = {
  /** value is NaN / not finite. */
  INVALID_NUMBER: 'INVALID_NUMBER',
  /** A negative physical quantity. */
  NEGATIVE: 'NEGATIVE',
  /** fromUnitId not found in the unit list. */
  UNKNOWN_UNIT: 'UNKNOWN_UNIT',
} as const;

/**
 * Format a converted value cleanly: exact integers at full precision, otherwise
 * ~6 significant figures via fixed notation (never scientific), trailing zeros
 * trimmed, float noise rounded away (e.g. 39.370078740157474 → "39.3701").
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (Number.isInteger(n) && abs < 1e21) return String(n);

  // 6 significant figures expressed as fixed decimals (no exponent):
  // decimals = 6 - 1 - floor(log10(abs)), clamped to a sane range.
  const exp = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, Math.min(100, 6 - 1 - exp));
  let s = n.toFixed(decimals);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

/**
 * Convert `value` (given in `fromUnitId`) into every OTHER unit in `units`. Pure
 * and total — returns a failure object (never throws) for an unknown unit, a
 * non-finite value, or a negative quantity. Allows 0 and decimals.
 */
export function convertLinear(
  value: number,
  fromUnitId: string,
  units: readonly LinearUnit[],
): LinearResult {
  const fromUnit = units.find((u) => u.id === fromUnitId);
  if (!fromUnit) {
    return fail<LinearSuccess>(LINEAR_ERROR.UNKNOWN_UNIT, 'Geçersiz birim seçildi.');
  }
  if (!Number.isFinite(value)) {
    return fail<LinearSuccess>(LINEAR_ERROR.INVALID_NUMBER, 'Geçerli bir sayı girin.');
  }
  if (value < 0) {
    return fail<LinearSuccess>(LINEAR_ERROR.NEGATIVE, 'Negatif değer girilemez.');
  }

  const baseValue = value * fromUnit.factorToBase;
  const rows: LinearRow[] = units
    .filter((u) => u.id !== fromUnitId)
    .map((u) => ({ label: u.label, value: formatNumber(baseValue / u.factorToBase) }));

  return { ok: true, rows };
}
