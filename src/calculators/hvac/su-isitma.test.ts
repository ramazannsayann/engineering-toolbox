import { describe, it, expect } from 'vitest';
import { solveWaterHeating, suIsitmaMeta, WATER_HEATING_ERROR, type WaterHeatingResult } from './su-isitma';

function expectError(result: WaterHeatingResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

function rowValue(result: WaterHeatingResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const r = result.powerRows.find((x) => x.label === label);
  if (!r) throw new Error(`no row "${label}"`);
  return r.value;
}

describe('solveWaterHeating — anchors', () => {
  it('100 L, ΔT 30, 60 min → ~3.4883 kW, ~3.4883 kWh, 12558 kJ', () => {
    const r = solveWaterHeating({ volumeL: 100, deltaT: 30, minutes: 60 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.energyKJ).toBeCloseTo(12558, 6); // 100*4186*30 = 12,558,000 J
    expect(r.energyKWh).toBeCloseTo(3.488333, 4);
    expect(r.powerKW).toBeCloseTo(3.488333, 4);
    expect(rowValue(r, 'BTU/saat')).toBe('11902.7'); // 3.48833 × 3412.142
    expect(rowValue(r, 'kcal/saat')).toBe('2999.43'); // 3.48833 × 859.845
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it('10 L, ΔT 50, 10 min → ~3.4883 kW, ~0.581389 kWh', () => {
    const r = solveWaterHeating({ volumeL: 10, deltaT: 50, minutes: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.powerKW).toBeCloseTo(3.488333, 4);
    expect(r.energyKWh).toBeCloseTo(0.581389, 5);
  });

  it('1 L, ΔT 1 → 4186 J (≈1.16 Wh)', () => {
    const r = solveWaterHeating({ volumeL: 1, deltaT: 1, minutes: 60 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.energyKJ).toBeCloseTo(4.186, 6); // 4186 J
    expect(r.energyKWh).toBeCloseTo(0.00116278, 7); // ≈1.16 Wh
  });
});

describe('solveWaterHeating — invalid input', () => {
  const base = { volumeL: 100, deltaT: 30, minutes: 60 };
  it('rejects non-positive volume / ΔT / minutes', () => {
    expectError(solveWaterHeating({ ...base, volumeL: 0 }), WATER_HEATING_ERROR.NON_POSITIVE_VOLUME);
    expectError(solveWaterHeating({ ...base, volumeL: -5 }), WATER_HEATING_ERROR.NON_POSITIVE_VOLUME);
    expectError(solveWaterHeating({ ...base, deltaT: 0 }), WATER_HEATING_ERROR.NON_POSITIVE_DELTA);
    expectError(solveWaterHeating({ ...base, minutes: 0 }), WATER_HEATING_ERROR.NON_POSITIVE_TIME);
  });
  it('rejects non-finite inputs', () => {
    expectError(solveWaterHeating({ ...base, volumeL: NaN }), WATER_HEATING_ERROR.INVALID_NUMBER);
    expectError(solveWaterHeating({ ...base, deltaT: Infinity }), WATER_HEATING_ERROR.INVALID_NUMBER);
  });
});

describe('suIsitmaMeta', () => {
  it('exposes the expected registry metadata (categoryId hvac, no formula)', () => {
    expect(suIsitmaMeta.id).toBe('su-isitma-gucu');
    expect(suIsitmaMeta.slug).toBe('su-isitma-gucu-hesaplayici');
    expect(suIsitmaMeta.categoryId).toBe('hvac');
    expect(suIsitmaMeta.formula).toBeUndefined();
    expect(suIsitmaMeta.faq?.length).toBe(2);
  });
});
