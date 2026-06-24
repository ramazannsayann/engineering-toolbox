import { describe, it, expect } from 'vitest';
import {
  solveTransformerSizing,
  transformerSizingMeta,
  STANDARD_TRANSFORMER_KVA,
  TRANSFORMER_SIZING_ERROR,
} from './trafo-boyutlandirma';

type Result = ReturnType<typeof solveTransformerSizing>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveTransformerSizing — valid (anchors)', () => {
  it('P 300 kW, cosφ 0.9, %25 → S_yük≈333.3, gereken≈416.7, önerilen 500 kVA', () => {
    const result = solveTransformerSizing({ loadPowerKw: 300, powerFactor: 0.9, marginPercent: 25 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.loadApparentKva).toBeCloseTo(333.333, 2);
    expect(result.values.requiredKva).toBeCloseTo(416.667, 2);
    expect(result.values.recommendedStandardKva).toBe(500);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('P 100 kW, cosφ 0.8, %0 → S_yük 125, gereken 125, önerilen 160 kVA', () => {
    const result = solveTransformerSizing({ loadPowerKw: 100, powerFactor: 0.8, marginPercent: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.loadApparentKva).toBeCloseTo(125, 6);
    expect(result.values.requiredKva).toBeCloseTo(125, 6);
    expect(result.values.recommendedStandardKva).toBe(160);
  });

  it('over-range: P 3000 kW, cosφ 1, %0 → gereken 3000, recommended = null (not a failure)', () => {
    const result = solveTransformerSizing({ loadPowerKw: 3000, powerFactor: 1, marginPercent: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.requiredKva).toBeCloseTo(3000, 6);
    expect(result.values.recommendedStandardKva).toBeNull();
  });
});

describe('solveTransformerSizing — invalid input', () => {
  it('rejects zero / negative load power', () => {
    expectError(
      solveTransformerSizing({ loadPowerKw: 0, powerFactor: 0.9, marginPercent: 25 }),
      TRANSFORMER_SIZING_ERROR.NON_POSITIVE_VALUE,
    );
    expectError(
      solveTransformerSizing({ loadPowerKw: -300, powerFactor: 0.9, marginPercent: 25 }),
      TRANSFORMER_SIZING_ERROR.NON_POSITIVE_VALUE,
    );
  });
  it('rejects cosφ out of range', () => {
    expectError(
      solveTransformerSizing({ loadPowerKw: 300, powerFactor: 1.2, marginPercent: 25 }),
      TRANSFORMER_SIZING_ERROR.POWER_FACTOR_RANGE,
    );
    expectError(
      solveTransformerSizing({ loadPowerKw: 300, powerFactor: 0, marginPercent: 25 }),
      TRANSFORMER_SIZING_ERROR.POWER_FACTOR_RANGE,
    );
  });
  it('rejects negative margin', () => {
    expectError(
      solveTransformerSizing({ loadPowerKw: 300, powerFactor: 0.9, marginPercent: -10 }),
      TRANSFORMER_SIZING_ERROR.MARGIN_RANGE,
    );
  });
  it('rejects non-finite', () => {
    expectError(
      solveTransformerSizing({ loadPowerKw: NaN, powerFactor: 0.9, marginPercent: 25 }),
      TRANSFORMER_SIZING_ERROR.INVALID_NUMBER,
    );
  });
  it('rejects a missing value', () => {
    expectError(
      solveTransformerSizing({ loadPowerKw: 300, powerFactor: 0.9 }),
      TRANSFORMER_SIZING_ERROR.MISSING_VALUE,
    );
  });
});

describe('transformerSizingMeta + standard series', () => {
  it('standard kVA series is the documented ascending IEC set', () => {
    expect(STANDARD_TRANSFORMER_KVA[0]).toBe(25);
    expect(STANDARD_TRANSFORMER_KVA[STANDARD_TRANSFORMER_KVA.length - 1]).toBe(2500);
    for (let i = 1; i < STANDARD_TRANSFORMER_KVA.length; i++) {
      expect(STANDARD_TRANSFORMER_KVA[i]).toBeGreaterThan(STANDARD_TRANSFORMER_KVA[i - 1]);
    }
  });
  it('exposes the expected registry metadata', () => {
    expect(transformerSizingMeta.id).toBe('trafo-boyutlandirma');
    expect(transformerSizingMeta.slug).toBe('trafo-boyutlandirma-hesaplayici');
    expect(transformerSizingMeta.categoryId).toBe('electrical');
  });
});
