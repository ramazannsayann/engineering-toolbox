import { describe, it, expect } from 'vitest';
import {
  solveVoltageDrop,
  voltageDropVolts,
  voltageDropMeta,
  STANDARD_CROSS_SECTIONS_MM2,
  VOLTAGE_DROP_ERROR,
} from './gerilim-dusumu';

type Result = ReturnType<typeof solveVoltageDrop>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('voltageDropVolts helper', () => {
  it('3φ: √3·L·I·ρ/A', () => {
    expect(voltageDropVolts(3, 20, 50, 6)).toBeCloseTo(5.0518, 3);
  });
  it('1φ: 2·L·I·ρ/A', () => {
    expect(voltageDropVolts(1, 16, 30, 2.5)).toBeCloseTo(6.72, 3);
  });
});

describe('solveVoltageDrop — valid (anchors)', () => {
  it('3φ, 400 V, 20 A, 50 m, 6 mm² → ~5.05 V, ~1.26 %', () => {
    const result = solveVoltageDrop({
      phase: 3,
      voltage: 400,
      current: 20,
      length: 50,
      crossSection: 6,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.voltageDrop).toBeCloseTo(5.05, 2);
    expect(result.values.dropPercent).toBeCloseTo(1.26, 2);
    expect(result.values.loadVoltage).toBeCloseTo(394.948, 2);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('1φ, 230 V, 16 A, 30 m, 2.5 mm² → ~6.72 V, ~2.92 %', () => {
    const result = solveVoltageDrop({
      phase: 1,
      voltage: 230,
      current: 16,
      length: 30,
      crossSection: 2.5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.voltageDrop).toBeCloseTo(6.72, 2);
    expect(result.values.dropPercent).toBeCloseTo(2.92, 2);
  });
});

describe('solveVoltageDrop — invalid input', () => {
  const base = { phase: 3, voltage: 400, current: 20, length: 50, crossSection: 6 };

  it('rejects an invalid phase', () => {
    expectError(solveVoltageDrop({ ...base, phase: 2 }), VOLTAGE_DROP_ERROR.INVALID_PHASE);
  });

  it('rejects zero / negative voltage, current, length', () => {
    expectError(solveVoltageDrop({ ...base, voltage: 0 }), VOLTAGE_DROP_ERROR.NON_POSITIVE_VALUE);
    expectError(solveVoltageDrop({ ...base, current: -20 }), VOLTAGE_DROP_ERROR.NON_POSITIVE_VALUE);
    expectError(solveVoltageDrop({ ...base, length: -1 }), VOLTAGE_DROP_ERROR.NON_POSITIVE_VALUE);
  });

  it('rejects a missing value', () => {
    expectError(
      solveVoltageDrop({ phase: 3, voltage: 400, current: 20, crossSection: 6 }),
      VOLTAGE_DROP_ERROR.MISSING_VALUE,
    );
  });

  it('rejects NaN / Infinity', () => {
    expectError(solveVoltageDrop({ ...base, current: NaN }), VOLTAGE_DROP_ERROR.INVALID_NUMBER);
    expectError(solveVoltageDrop({ ...base, length: Infinity }), VOLTAGE_DROP_ERROR.INVALID_NUMBER);
  });

  it('rejects a non-standard cross-section', () => {
    expectError(
      solveVoltageDrop({ ...base, crossSection: 5 }),
      VOLTAGE_DROP_ERROR.INVALID_CROSS_SECTION,
    );
  });

  it('rejects a missing cross-section', () => {
    expectError(
      solveVoltageDrop({ phase: 3, voltage: 400, current: 20, length: 50 }),
      VOLTAGE_DROP_ERROR.MISSING_VALUE,
    );
  });
});

describe('exports for cable sizing', () => {
  it('exposes the standard cross-section series', () => {
    expect(STANDARD_CROSS_SECTIONS_MM2).toContain(6);
    expect(STANDARD_CROSS_SECTIONS_MM2[0]).toBe(1.5);
    expect(STANDARD_CROSS_SECTIONS_MM2.length).toBe(15);
  });
});

describe('voltageDropMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(voltageDropMeta.id).toBe('gerilim-dusumu');
    expect(voltageDropMeta.slug).toBe('gerilim-dusumu-hesaplayici');
    expect(voltageDropMeta.categoryId).toBe('electrical');
  });
});
