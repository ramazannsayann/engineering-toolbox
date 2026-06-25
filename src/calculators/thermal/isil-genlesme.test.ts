import { describe, it, expect } from 'vitest';
import {
  solveThermalExpansion,
  isilGenlesmeMeta,
  THERMAL_EXPANSION_ERROR,
  EXPANSION_MATERIALS,
  OZEL_ID,
  type ThermalExpansionResult,
} from './isil-genlesme';

function expectError(result: ThermalExpansionResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveThermalExpansion — ΔL = α·L·ΔT anchors', () => {
  it('steel, L=10m, ΔT=50 → 6 mm, new length 10.006 m', () => {
    const r = solveThermalExpansion({ lengthM: 10, deltaT: 50, materialId: 'celik' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deltaLm).toBeCloseTo(0.006, 9); // 12e-6×10×50
    expect(r.deltaLmm).toBeCloseTo(6, 9);
    expect(r.newLengthM).toBeCloseTo(10.006, 9);
    expect(r.alphaUsed).toBe(12e-6);
    expect(r.direction).toBe('uzama');
  });

  it('aluminium, L=5m, ΔT=40 → 4.6 mm', () => {
    const r = solveThermalExpansion({ lengthM: 5, deltaT: 40, materialId: 'aluminyum' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deltaLmm).toBeCloseTo(4.6, 9); // 23e-6×5×40 = 0.0046 m
    expect(r.alphaUsed).toBe(23e-6);
  });

  it('steel, L=10m, ΔT=−30 → −3.6 mm (kısalma), new length 9.9964 m', () => {
    const r = solveThermalExpansion({ lengthM: 10, deltaT: -30, materialId: 'celik' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deltaLmm).toBeCloseTo(-3.6, 9); // 12e-6×10×−30 = −0.0036 m
    expect(r.newLengthM).toBeCloseTo(9.9964, 9);
    expect(r.direction).toBe('kısalma');
  });

  it('custom α: L=2m, ΔT=100, customAlpha=50e-6 → 10 mm', () => {
    const r = solveThermalExpansion({ lengthM: 2, deltaT: 100, materialId: OZEL_ID, customAlpha: 50e-6 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.deltaLmm).toBeCloseTo(10, 9); // 50e-6×2×100 = 0.01 m
    expect(r.alphaUsed).toBe(50e-6);
    expect(r.materialLabel).toBe('Özel (elle gir, 1/°C)');
  });
});

describe('solveThermalExpansion — material lookup uses table α', () => {
  it('each non-ozel material resolves to its table α', () => {
    for (const m of EXPANSION_MATERIALS) {
      if (m.alpha === null) continue;
      const r = solveThermalExpansion({ lengthM: 3, deltaT: 20, materialId: m.id });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.alphaUsed).toBe(m.alpha);
      expect(r.deltaLm).toBeCloseTo(m.alpha * 3 * 20, 12);
    }
  });
});

describe('solveThermalExpansion — invalid input', () => {
  it('rejects bad length / zero ΔT / material / custom α / non-finite', () => {
    expectError(solveThermalExpansion({ lengthM: 0, deltaT: 50, materialId: 'celik' }), THERMAL_EXPANSION_ERROR.NON_POSITIVE_LENGTH);
    expectError(solveThermalExpansion({ lengthM: -10, deltaT: 50, materialId: 'celik' }), THERMAL_EXPANSION_ERROR.NON_POSITIVE_LENGTH);
    expectError(solveThermalExpansion({ lengthM: 10, deltaT: 0, materialId: 'celik' }), THERMAL_EXPANSION_ERROR.ZERO_DELTA);
    expectError(solveThermalExpansion({ lengthM: 10, deltaT: 50, materialId: 'altin' }), THERMAL_EXPANSION_ERROR.UNKNOWN_MATERIAL);
    expectError(solveThermalExpansion({ lengthM: 10, deltaT: 50, materialId: OZEL_ID }), THERMAL_EXPANSION_ERROR.INVALID_CUSTOM_ALPHA);
    expectError(solveThermalExpansion({ lengthM: 10, deltaT: 50, materialId: OZEL_ID, customAlpha: 0 }), THERMAL_EXPANSION_ERROR.INVALID_CUSTOM_ALPHA);
    expectError(solveThermalExpansion({ lengthM: 10, deltaT: 50, materialId: OZEL_ID, customAlpha: -1e-6 }), THERMAL_EXPANSION_ERROR.INVALID_CUSTOM_ALPHA);
    expectError(solveThermalExpansion({ lengthM: NaN, deltaT: 50, materialId: 'celik' }), THERMAL_EXPANSION_ERROR.INVALID_NUMBER);
    expectError(solveThermalExpansion({ lengthM: 10, deltaT: Infinity, materialId: 'celik' }), THERMAL_EXPANSION_ERROR.INVALID_NUMBER);
  });

  it('allows negative ΔT (contraction is valid physics)', () => {
    const r = solveThermalExpansion({ lengthM: 10, deltaT: -50, materialId: 'celik' });
    expect(r.ok).toBe(true);
  });
});

describe('expansion materials table & metadata', () => {
  it('exposes auditable textbook expansion coefficients (1/°C)', () => {
    expect(EXPANSION_MATERIALS.map((m) => [m.id, m.alpha])).toEqual([
      ['celik', 12e-6],
      ['aluminyum', 23e-6],
      ['bakir', 17e-6],
      ['beton', 12e-6],
      ['cam', 9e-6],
      ['pvc', 80e-6],
      ['ozel', null],
    ]);
  });

  it('exposes the expected registry metadata', () => {
    expect(isilGenlesmeMeta.id).toBe('isil-genlesme');
    expect(isilGenlesmeMeta.slug).toBe('isil-genlesme-hesaplama');
    expect(isilGenlesmeMeta.categoryId).toBe('thermal');
    expect(isilGenlesmeMeta.formula).toBeUndefined();
    expect(isilGenlesmeMeta.faq?.length).toBe(2);
  });
});
