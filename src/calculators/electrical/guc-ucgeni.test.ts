import { describe, it, expect } from 'vitest';
import {
  solvePowerTriangle,
  powerTriangleMeta,
  POWER_TRIANGLE_ERROR,
} from './guc-ucgeni';

type Result = ReturnType<typeof solvePowerTriangle>;

function expectValues(
  result: Result,
  expected: { P: number; Q: number; S: number; cosphi: number },
): void {
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.values.activePower).toBeCloseTo(expected.P);
  expect(result.values.reactivePower).toBeCloseTo(expected.Q);
  expect(result.values.apparentPower).toBeCloseTo(expected.S);
  expect(result.values.powerFactor).toBeCloseTo(expected.cosphi);
}

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

const ANCHOR = { P: 8, Q: 6, S: 10, cosphi: 0.8 };

describe('solvePowerTriangle — valid pairs', () => {
  it('P + cosφ → S, Q (anchor)', () => {
    expectValues(solvePowerTriangle({ activePower: 8, powerFactor: 0.8 }), ANCHOR);
  });

  it('P + Q → S, cosφ (anchor)', () => {
    expectValues(solvePowerTriangle({ activePower: 8, reactivePower: 6 }), ANCHOR);
  });

  it('P + S → cosφ, Q', () => {
    expectValues(solvePowerTriangle({ activePower: 8, apparentPower: 10 }), ANCHOR);
  });

  it('Q + S → P, cosφ', () => {
    expectValues(solvePowerTriangle({ reactivePower: 6, apparentPower: 10 }), ANCHOR);
  });

  it('Q + cosφ → S, P', () => {
    expectValues(solvePowerTriangle({ reactivePower: 6, powerFactor: 0.8 }), ANCHOR);
  });

  it('S + cosφ → P, Q', () => {
    expectValues(solvePowerTriangle({ apparentPower: 10, powerFactor: 0.8 }), ANCHOR);
  });

  it('allows unity power factor (Q = 0)', () => {
    const result = solvePowerTriangle({ activePower: 5, powerFactor: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.apparentPower).toBeCloseTo(5);
    expect(result.values.reactivePower).toBeCloseTo(0);
  });

  it('includes non-empty derivation steps', () => {
    const result = solvePowerTriangle({ activePower: 8, powerFactor: 0.8 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('solvePowerTriangle — invalid input', () => {
  it('rejects zero values provided', () => {
    expectError(solvePowerTriangle({}), POWER_TRIANGLE_ERROR.INSUFFICIENT_VALUES);
  });

  it('rejects one value', () => {
    expectError(
      solvePowerTriangle({ activePower: 8 }),
      POWER_TRIANGLE_ERROR.INSUFFICIENT_VALUES,
    );
  });

  it('rejects three values', () => {
    expectError(
      solvePowerTriangle({ activePower: 8, reactivePower: 6, apparentPower: 10 }),
      POWER_TRIANGLE_ERROR.TOO_MANY_VALUES,
    );
  });

  it('rejects four values', () => {
    expectError(
      solvePowerTriangle({
        activePower: 8,
        reactivePower: 6,
        apparentPower: 10,
        powerFactor: 0.8,
      }),
      POWER_TRIANGLE_ERROR.TOO_MANY_VALUES,
    );
  });

  it('rejects a negative value', () => {
    expectError(
      solvePowerTriangle({ activePower: -8, powerFactor: 0.8 }),
      POWER_TRIANGLE_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects a zero value', () => {
    expectError(
      solvePowerTriangle({ activePower: 0, reactivePower: 6 }),
      POWER_TRIANGLE_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects cosφ > 1', () => {
    expectError(
      solvePowerTriangle({ activePower: 8, powerFactor: 1.2 }),
      POWER_TRIANGLE_ERROR.POWER_FACTOR_RANGE,
    );
  });

  it('rejects NaN / Infinity', () => {
    expectError(
      solvePowerTriangle({ activePower: NaN, powerFactor: 0.8 }),
      POWER_TRIANGLE_ERROR.INVALID_NUMBER,
    );
    expectError(
      solvePowerTriangle({ activePower: Infinity, powerFactor: 0.8 }),
      POWER_TRIANGLE_ERROR.INVALID_NUMBER,
    );
  });

  it('rejects an infeasible pair (P > S)', () => {
    expectError(
      solvePowerTriangle({ activePower: 10, apparentPower: 8 }),
      POWER_TRIANGLE_ERROR.INFEASIBLE,
    );
  });

  it('rejects Q with cosφ = 1 (sinφ = 0)', () => {
    expectError(
      solvePowerTriangle({ reactivePower: 6, powerFactor: 1 }),
      POWER_TRIANGLE_ERROR.INFEASIBLE,
    );
  });

  it('rejects the degenerate Q = S (pure reactive) as INFEASIBLE, not a range error', () => {
    expectError(
      solvePowerTriangle({ reactivePower: 10, apparentPower: 10 }),
      POWER_TRIANGLE_ERROR.INFEASIBLE,
    );
  });

  it('accepts the mirror boundary P = S (unity power factor, Q = 0)', () => {
    const result = solvePowerTriangle({ activePower: 10, apparentPower: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.reactivePower).toBeCloseTo(0);
    expect(result.values.powerFactor).toBeCloseTo(1);
  });
});

describe('powerTriangleMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(powerTriangleMeta.id).toBe('guc-ucgeni');
    expect(powerTriangleMeta.slug).toBe('guc-ucgeni-hesaplayici');
    expect(powerTriangleMeta.categoryId).toBe('electrical');
  });
});
