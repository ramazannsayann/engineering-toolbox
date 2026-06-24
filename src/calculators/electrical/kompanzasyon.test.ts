import { describe, it, expect } from 'vitest';
import {
  solveCompensation,
  compensationMeta,
  COMPENSATION_ERROR,
} from './kompanzasyon';

type Result = ReturnType<typeof solveCompensation>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveCompensation — valid', () => {
  it('anchor: P 100 kW, 0.8 → 0.95 → ~42.13 kvar', () => {
    const result = solveCompensation({
      activePower: 100,
      currentPowerFactor: 0.8,
      targetPowerFactor: 0.95,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.requiredKvar).toBeCloseTo(42.1316, 3);
    expect(result.values.apparentBefore).toBeCloseTo(125, 3);
    expect(result.values.apparentAfter).toBeCloseTo(105.263, 3);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('solveCompensation — invalid input', () => {
  it('rejects negative / zero P', () => {
    expectError(
      solveCompensation({ activePower: -100, currentPowerFactor: 0.8, targetPowerFactor: 0.95 }),
      COMPENSATION_ERROR.NON_POSITIVE_VALUE,
    );
    expectError(
      solveCompensation({ activePower: 0, currentPowerFactor: 0.8, targetPowerFactor: 0.95 }),
      COMPENSATION_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects cosφ out of range', () => {
    expectError(
      solveCompensation({ activePower: 100, currentPowerFactor: 0, targetPowerFactor: 0.95 }),
      COMPENSATION_ERROR.POWER_FACTOR_RANGE,
    );
    expectError(
      solveCompensation({ activePower: 100, currentPowerFactor: 0.8, targetPowerFactor: 1.2 }),
      COMPENSATION_ERROR.POWER_FACTOR_RANGE,
    );
  });

  it('rejects target ≤ current power factor', () => {
    expectError(
      solveCompensation({ activePower: 100, currentPowerFactor: 0.95, targetPowerFactor: 0.8 }),
      COMPENSATION_ERROR.TARGET_NOT_GREATER,
    );
    expectError(
      solveCompensation({ activePower: 100, currentPowerFactor: 0.9, targetPowerFactor: 0.9 }),
      COMPENSATION_ERROR.TARGET_NOT_GREATER,
    );
  });

  it('rejects a missing value', () => {
    expectError(
      solveCompensation({ activePower: 100, currentPowerFactor: 0.8 }),
      COMPENSATION_ERROR.MISSING_VALUE,
    );
  });

  it('rejects NaN / Infinity', () => {
    expectError(
      solveCompensation({ activePower: NaN, currentPowerFactor: 0.8, targetPowerFactor: 0.95 }),
      COMPENSATION_ERROR.INVALID_NUMBER,
    );
  });
});

describe('compensationMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(compensationMeta.id).toBe('kompanzasyon');
    expect(compensationMeta.slug).toBe('kompanzasyon-hesaplayici');
    expect(compensationMeta.categoryId).toBe('electrical');
  });
});
