import { describe, it, expect } from 'vitest';
import { solveCurrent, currentMeta, CURRENT_ERROR } from './amper-hesabi';

type Result = ReturnType<typeof solveCurrent>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveCurrent — valid', () => {
  it('kVA path, 3φ: 10 kVA, 400 V → ~14.43 A', () => {
    const result = solveCurrent({ powerType: 'kVA', power: 10, voltage: 400, phase: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.current).toBeCloseTo(14.4338, 3);
    expect(result.values.apparentPower).toBeCloseTo(10, 6);
    expect(result.values.activePower).toBeUndefined();
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('kW path, 3φ: 8 kW, cosφ 0.8, 400 V → S 10 kVA, ~14.43 A', () => {
    const result = solveCurrent({
      powerType: 'kW',
      power: 8,
      powerFactor: 0.8,
      voltage: 400,
      phase: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.apparentPower).toBeCloseTo(10, 6);
    expect(result.values.current).toBeCloseTo(14.4338, 3);
    expect(result.values.activePower).toBeCloseTo(8, 6);
  });

  it('1φ: 2.3 kVA, 230 V → 10 A', () => {
    const result = solveCurrent({ powerType: 'kVA', power: 2.3, voltage: 230, phase: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.current).toBeCloseTo(10, 6);
  });
});

describe('solveCurrent — invalid input', () => {
  it('rejects an invalid phase', () => {
    expectError(
      solveCurrent({ powerType: 'kVA', power: 10, voltage: 400, phase: 2 }),
      CURRENT_ERROR.INVALID_PHASE,
    );
  });

  it('rejects an invalid power type', () => {
    expectError(
      // @ts-expect-error testing a bad power type at runtime
      solveCurrent({ powerType: 'kVAr', power: 10, voltage: 400, phase: 3 }),
      CURRENT_ERROR.INVALID_POWER_TYPE,
    );
  });

  it('rejects kW path with missing cosφ', () => {
    expectError(
      solveCurrent({ powerType: 'kW', power: 8, voltage: 400, phase: 3 }),
      CURRENT_ERROR.MISSING_VALUE,
    );
  });

  it('rejects kW path with cosφ out of range', () => {
    expectError(
      solveCurrent({ powerType: 'kW', power: 8, powerFactor: 1.5, voltage: 400, phase: 3 }),
      CURRENT_ERROR.POWER_FACTOR_RANGE,
    );
  });

  it('rejects negative / zero power or voltage', () => {
    expectError(
      solveCurrent({ powerType: 'kVA', power: -10, voltage: 400, phase: 3 }),
      CURRENT_ERROR.NON_POSITIVE_VALUE,
    );
    expectError(
      solveCurrent({ powerType: 'kVA', power: 10, voltage: 0, phase: 1 }),
      CURRENT_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects NaN / Infinity', () => {
    expectError(
      solveCurrent({ powerType: 'kVA', power: NaN, voltage: 400, phase: 3 }),
      CURRENT_ERROR.INVALID_NUMBER,
    );
  });

  it('rejects a missing power value', () => {
    expectError(
      solveCurrent({ powerType: 'kVA', voltage: 400, phase: 3 }),
      CURRENT_ERROR.MISSING_VALUE,
    );
  });
});

describe('currentMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(currentMeta.id).toBe('amper-hesabi');
    expect(currentMeta.slug).toBe('amper-hesaplayici');
    expect(currentMeta.categoryId).toBe('electrical');
  });
});
