/**
 * Reusable power-unit helper for the HVAC category — pure, framework-agnostic.
 *
 * Converts a power in kW into the three units HVAC tools care about (kW, BTU/h,
 * kcal/h) and returns formatted, copyable rows. Future HVAC tools (AC BTU, heat
 * loss, pump) reuse this. No React/Astro/DOM imports.
 */
import { formatNumber } from '../general/linear-convert';

/** 1 kW = 3412.142 BTU/h. */
export const KW_TO_BTU_PER_H = 3412.142;
/** 1 kW = 859.845 kcal/h. */
export const KW_TO_KCAL_PER_H = 859.845;

export interface PowerRow {
  readonly label: string;
  readonly value: string;
}

/**
 * Rows for a power expressed in kW, BTU/h and kcal/h. `format` defaults to the
 * shared `formatNumber` but can be injected (e.g. an engine passing its own).
 */
export function powerRows(
  kW: number,
  format: (n: number) => string = formatNumber,
): PowerRow[] {
  return [
    { label: 'Kilovat (kW)', value: format(kW) },
    { label: 'BTU/saat', value: format(kW * KW_TO_BTU_PER_H) },
    { label: 'kcal/saat', value: format(kW * KW_TO_KCAL_PER_H) },
  ];
}
