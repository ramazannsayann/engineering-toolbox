import { describe, it, expect } from 'vitest';
import { solvePower, powerMeta, POWER_ERROR } from './guc-hesabi';

type Result = ReturnType<typeof solvePower>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solvePower — valid', () => {
  it('3φ anchor: 400 V, 10 A, cosφ 0.8 → ~5.54 kW, ~6.93 kVA, ~4.16 kvar', () => {
    const result = solvePower({ phase: 3, voltage: 400, current: 10, powerFactor: 0.8 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.apparentPower).toBeCloseTo(6.9282, 3);
    expect(result.values.activePower).toBeCloseTo(5.5426, 3);
    expect(result.values.reactivePower).toBeCloseTo(4.1569, 3);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('1φ anchor: 230 V, 10 A, cosφ 1 → 2.3 kVA, 2.3 kW, ~0 kvar', () => {
    const result = solvePower({ phase: 1, voltage: 230, current: 10, powerFactor: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.apparentPower).toBeCloseTo(2.3, 6);
    expect(result.values.activePower).toBeCloseTo(2.3, 6);
    expect(result.values.reactivePower).toBeCloseTo(0, 6);
  });
});

describe('solvePower — invalid input', () => {
  it('rejects an invalid phase', () => {
    expectError(
      solvePower({ phase: 2, voltage: 400, current: 10, powerFactor: 0.8 }),
      POWER_ERROR.INVALID_PHASE,
    );
  });

  it('rejects a missing value', () => {
    expectError(
      solvePower({ phase: 3, voltage: 400, powerFactor: 0.8 }),
      POWER_ERROR.MISSING_VALUE,
    );
  });

  it('rejects negative / zero voltage or current', () => {
    expectError(
      solvePower({ phase: 3, voltage: -400, current: 10, powerFactor: 0.8 }),
      POWER_ERROR.NON_POSITIVE_VALUE,
    );
    expectError(
      solvePower({ phase: 1, voltage: 230, current: 0, powerFactor: 1 }),
      POWER_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects cosφ > 1', () => {
    expectError(
      solvePower({ phase: 3, voltage: 400, current: 10, powerFactor: 1.1 }),
      POWER_ERROR.POWER_FACTOR_RANGE,
    );
  });

  it('rejects NaN / Infinity', () => {
    expectError(
      solvePower({ phase: 3, voltage: NaN, current: 10, powerFactor: 0.8 }),
      POWER_ERROR.INVALID_NUMBER,
    );
    expectError(
      solvePower({ phase: 1, voltage: 230, current: Infinity, powerFactor: 1 }),
      POWER_ERROR.INVALID_NUMBER,
    );
  });
});

describe('powerMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(powerMeta.id).toBe('guc-hesabi');
    expect(powerMeta.slug).toBe('guc-hesaplayici');
    expect(powerMeta.categoryId).toBe('electrical');
  });
});
