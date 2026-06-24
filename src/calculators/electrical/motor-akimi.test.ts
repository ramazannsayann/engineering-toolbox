import { describe, it, expect } from 'vitest';
import { solveMotorCurrent, motorCurrentMeta, MOTOR_CURRENT_ERROR } from './motor-akimi';

type Result = ReturnType<typeof solveMotorCurrent>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveMotorCurrent — valid (anchors)', () => {
  it('3φ: 7.5 kW, 400 V, η 90%, cosφ 0.85 → P_in≈8.33 kW, I≈14.15 A, loss≈0.83 kW', () => {
    const result = solveMotorCurrent({
      phase: 3,
      outputPowerKw: 7.5,
      voltageV: 400,
      efficiencyPercent: 90,
      powerFactor: 0.85,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.inputPowerKw).toBeCloseTo(8.3333, 3);
    expect(result.values.current).toBeCloseTo(14.1508, 3);
    expect(result.values.lossesKw).toBeCloseTo(0.8333, 3);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('1φ: 2.2 kW, 230 V, η 85%, cosφ 0.8 → P_in≈2.588 kW, I≈14.07 A', () => {
    const result = solveMotorCurrent({
      phase: 1,
      outputPowerKw: 2.2,
      voltageV: 230,
      efficiencyPercent: 85,
      powerFactor: 0.8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.inputPowerKw).toBeCloseTo(2.5882, 3);
    expect(result.values.current).toBeCloseTo(14.066, 2);
  });

  it('η = 100% → zero losses', () => {
    const result = solveMotorCurrent({
      phase: 3,
      outputPowerKw: 10,
      voltageV: 400,
      efficiencyPercent: 100,
      powerFactor: 0.9,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.lossesKw).toBeCloseTo(0, 6);
    expect(result.values.inputPowerKw).toBeCloseTo(10, 6);
  });
});

describe('solveMotorCurrent — invalid input', () => {
  const base = { phase: 3, outputPowerKw: 7.5, voltageV: 400, efficiencyPercent: 90, powerFactor: 0.85 };

  it('rejects an invalid phase', () => {
    expectError(solveMotorCurrent({ ...base, phase: 2 }), MOTOR_CURRENT_ERROR.INVALID_PHASE);
  });
  it('rejects zero / negative output power or voltage', () => {
    expectError(solveMotorCurrent({ ...base, outputPowerKw: 0 }), MOTOR_CURRENT_ERROR.NON_POSITIVE_VALUE);
    expectError(solveMotorCurrent({ ...base, voltageV: -400 }), MOTOR_CURRENT_ERROR.NON_POSITIVE_VALUE);
  });
  it('rejects η out of range (>100 or ≤0)', () => {
    expectError(solveMotorCurrent({ ...base, efficiencyPercent: 101 }), MOTOR_CURRENT_ERROR.EFFICIENCY_RANGE);
    expectError(solveMotorCurrent({ ...base, efficiencyPercent: 0 }), MOTOR_CURRENT_ERROR.EFFICIENCY_RANGE);
  });
  it('rejects cosφ > 1', () => {
    expectError(solveMotorCurrent({ ...base, powerFactor: 1.1 }), MOTOR_CURRENT_ERROR.POWER_FACTOR_RANGE);
  });
  it('rejects non-finite', () => {
    expectError(solveMotorCurrent({ ...base, outputPowerKw: NaN }), MOTOR_CURRENT_ERROR.INVALID_NUMBER);
    expectError(solveMotorCurrent({ ...base, voltageV: Infinity }), MOTOR_CURRENT_ERROR.INVALID_NUMBER);
  });
  it('rejects a missing value', () => {
    expectError(
      solveMotorCurrent({ phase: 3, outputPowerKw: 7.5, voltageV: 400, powerFactor: 0.85 }),
      MOTOR_CURRENT_ERROR.MISSING_VALUE,
    );
  });
});

describe('motorCurrentMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(motorCurrentMeta.id).toBe('motor-akimi');
    expect(motorCurrentMeta.slug).toBe('motor-akimi-hesaplayici');
    expect(motorCurrentMeta.categoryId).toBe('electrical');
  });
});
