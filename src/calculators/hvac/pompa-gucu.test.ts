import { describe, it, expect } from 'vitest';
import { solvePumpPower, pompaGucuMeta, PUMP_POWER_ERROR, type PumpPowerResult } from './pompa-gucu';

function expectError(result: PumpPowerResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solvePumpPower — anchors', () => {
  it('Q=10 m³/h, H=20m, η=70% → hidrolik ≈0.545 kW, mil ≈0.778571 kW, ≈1.04408 HP', () => {
    const r = solvePumpPower({ flowM3h: 10, headM: 20, efficiencyPct: 70 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hydraulicKW).toBeCloseTo(0.545, 3);
    expect(r.shaftKW).toBeCloseTo(0.778571, 5);
    expect(r.shaftHP).toBeCloseTo(1.04408, 4);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it('Q=20 m³/h, H=10m, η=75% → hidrolik ≈0.545 kW, mil ≈0.726667 kW', () => {
    const r = solvePumpPower({ flowM3h: 20, headM: 10, efficiencyPct: 75 });
    expect(r.ok && r.hydraulicKW).toBeCloseTo(0.545, 3);
    expect(r.ok && r.shaftKW).toBeCloseTo(0.726667, 5);
  });

  it('η = 100% → shaft equals hydraulic', () => {
    const r = solvePumpPower({ flowM3h: 10, headM: 20, efficiencyPct: 100 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shaftKW).toBeCloseTo(r.hydraulicKW, 9);
  });
});

describe('solvePumpPower — invalid input', () => {
  const base = { flowM3h: 10, headM: 20, efficiencyPct: 70 };
  it('rejects non-positive flow/head, efficiency out of range, non-finite', () => {
    expectError(solvePumpPower({ ...base, flowM3h: 0 }), PUMP_POWER_ERROR.NON_POSITIVE_FLOW);
    expectError(solvePumpPower({ ...base, headM: -5 }), PUMP_POWER_ERROR.NON_POSITIVE_HEAD);
    expectError(solvePumpPower({ ...base, efficiencyPct: 0 }), PUMP_POWER_ERROR.EFFICIENCY_RANGE);
    expectError(solvePumpPower({ ...base, efficiencyPct: 120 }), PUMP_POWER_ERROR.EFFICIENCY_RANGE);
    expectError(solvePumpPower({ ...base, flowM3h: NaN }), PUMP_POWER_ERROR.INVALID_NUMBER);
  });
});

describe('pompaGucuMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(pompaGucuMeta.id).toBe('pompa-gucu');
    expect(pompaGucuMeta.slug).toBe('pompa-gucu-hesaplayici');
    expect(pompaGucuMeta.categoryId).toBe('hvac');
    expect(pompaGucuMeta.formula).toBeUndefined();
    expect(pompaGucuMeta.faq?.length).toBe(2);
  });
});
