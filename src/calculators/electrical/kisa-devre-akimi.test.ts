import { describe, it, expect } from 'vitest';
import { solveShortCircuit, shortCircuitMeta, SHORT_CIRCUIT_ERROR } from './kisa-devre-akimi';

type Result = ReturnType<typeof solveShortCircuit>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveShortCircuit — valid (anchors)', () => {
  it('3φ: 630 kVA, 400 V, uk 4% → I_n≈909.3 A, I_k≈22.73 kA', () => {
    const result = solveShortCircuit({ phase: 3, transformerKva: 630, voltageV: 400, impedancePercent: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.nominalCurrentA).toBeCloseTo(909.327, 2);
    expect(result.values.shortCircuitKa).toBeCloseTo(22.7332, 3);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('3φ: 1000 kVA, 400 V, uk 6% → I_n≈1443.4 A, I_k≈24.06 kA', () => {
    const result = solveShortCircuit({ phase: 3, transformerKva: 1000, voltageV: 400, impedancePercent: 6 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.nominalCurrentA).toBeCloseTo(1443.38, 1);
    expect(result.values.shortCircuitKa).toBeCloseTo(24.0563, 3);
  });

  it('1φ: 100 kVA, 230 V, uk 4% → I_n = S·1000/V', () => {
    const result = solveShortCircuit({ phase: 1, transformerKva: 100, voltageV: 230, impedancePercent: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.nominalCurrentA).toBeCloseTo(434.783, 2); // 100000/230
    expect(result.values.shortCircuitKa).toBeCloseTo(10.8696, 3); // /0.04 /1000
  });
});

describe('solveShortCircuit — invalid input', () => {
  const base = { phase: 3, transformerKva: 630, voltageV: 400, impedancePercent: 4 };

  it('rejects an invalid phase', () => {
    expectError(solveShortCircuit({ ...base, phase: 2 }), SHORT_CIRCUIT_ERROR.INVALID_PHASE);
  });
  it('rejects zero / negative S or V', () => {
    expectError(solveShortCircuit({ ...base, transformerKva: 0 }), SHORT_CIRCUIT_ERROR.NON_POSITIVE_VALUE);
    expectError(solveShortCircuit({ ...base, voltageV: -400 }), SHORT_CIRCUIT_ERROR.NON_POSITIVE_VALUE);
  });
  it('rejects uk out of range (>100 or ≤0)', () => {
    expectError(solveShortCircuit({ ...base, impedancePercent: 101 }), SHORT_CIRCUIT_ERROR.IMPEDANCE_RANGE);
    expectError(solveShortCircuit({ ...base, impedancePercent: 0 }), SHORT_CIRCUIT_ERROR.IMPEDANCE_RANGE);
  });
  it('rejects non-finite', () => {
    expectError(solveShortCircuit({ ...base, transformerKva: NaN }), SHORT_CIRCUIT_ERROR.INVALID_NUMBER);
    expectError(solveShortCircuit({ ...base, voltageV: Infinity }), SHORT_CIRCUIT_ERROR.INVALID_NUMBER);
  });
  it('rejects a missing value', () => {
    expectError(
      solveShortCircuit({ phase: 3, transformerKva: 630, voltageV: 400 }),
      SHORT_CIRCUIT_ERROR.MISSING_VALUE,
    );
  });
});

describe('shortCircuitMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(shortCircuitMeta.id).toBe('kisa-devre-akimi');
    expect(shortCircuitMeta.slug).toBe('kisa-devre-akimi-hesaplayici');
    expect(shortCircuitMeta.categoryId).toBe('electrical');
  });
});
