import { describe, it, expect } from 'vitest';
import {
  solveHeatConduction,
  isiIletimiMeta,
  HEAT_CONDUCTION_ERROR,
  CONDUCTIVITY_MATERIALS,
  OZEL_ID,
  type HeatConductionResult,
} from './isi-iletimi';

function expectError(result: HeatConductionResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveHeatConduction — Q = k·A·ΔT/d anchors', () => {
  it('copper(401), A=2, ΔT=50, d=10mm → 4,010,000 W = 4010 kW', () => {
    const r = solveHeatConduction({ areaM2: 2, deltaT: 50, thicknessMm: 10, materialId: 'bakir' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.heatRateW).toBeCloseTo(4_010_000, 3); // 401×2×50/0.01
    expect(r.heatRateKW).toBeCloseTo(4010, 6);
    expect(r.kUsed).toBe(401);
    expect(r.materialLabel).toBe('Bakır');
  });

  it('insulation(0.04), A=10, ΔT=20, d=100mm → 80 W', () => {
    const r = solveHeatConduction({ areaM2: 10, deltaT: 20, thicknessMm: 100, materialId: 'yalitim' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.heatRateW).toBeCloseTo(80, 9); // 0.04×10×20/0.1
    expect(r.heatRateKW).toBeCloseTo(0.08, 9);
    expect(r.kUsed).toBe(0.04);
  });

  it('steel(50), A=1, ΔT=100, d=5mm → 1,000,000 W', () => {
    const r = solveHeatConduction({ areaM2: 1, deltaT: 100, thicknessMm: 5, materialId: 'celik' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.heatRateW).toBeCloseTo(1_000_000, 3); // 50×1×100/0.005
    expect(r.kUsed).toBe(50);
  });

  it('custom k: A=2, ΔT=10, d=20mm, customK=1.5 → 1500 W', () => {
    const r = solveHeatConduction({ areaM2: 2, deltaT: 10, thicknessMm: 20, materialId: OZEL_ID, customK: 1.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.heatRateW).toBeCloseTo(1500, 6); // 1.5×2×10/0.02
    expect(r.kUsed).toBe(1.5);
    expect(r.materialLabel).toBe('Özel (elle gir, W/m·K)');
  });
});

describe('solveHeatConduction — material lookup uses table k', () => {
  it('each non-ozel material resolves to its table k', () => {
    for (const m of CONDUCTIVITY_MATERIALS) {
      if (m.k === null) continue;
      const r = solveHeatConduction({ areaM2: 1, deltaT: 10, thicknessMm: 50, materialId: m.id });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.kUsed).toBe(m.k);
      expect(r.heatRateW).toBeCloseTo((m.k * 1 * 10) / 0.05, 6);
    }
  });

  it('rows expose W / kW', () => {
    const r = solveHeatConduction({ areaM2: 2, deltaT: 50, thicknessMm: 10, materialId: 'bakir' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.label)).toEqual(['Isı akısı (W)', 'Isı akısı (kW)']);
  });
});

describe('solveHeatConduction — invalid input', () => {
  it('rejects bad area / ΔT / thickness / material / custom k / non-finite', () => {
    expectError(solveHeatConduction({ areaM2: 0, deltaT: 50, thicknessMm: 10, materialId: 'bakir' }), HEAT_CONDUCTION_ERROR.NON_POSITIVE_AREA);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: 0, thicknessMm: 10, materialId: 'bakir' }), HEAT_CONDUCTION_ERROR.NON_POSITIVE_DELTA);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: -50, thicknessMm: 10, materialId: 'bakir' }), HEAT_CONDUCTION_ERROR.NON_POSITIVE_DELTA);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: 50, thicknessMm: 0, materialId: 'bakir' }), HEAT_CONDUCTION_ERROR.NON_POSITIVE_THICKNESS);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: 50, thicknessMm: 10, materialId: 'tahta' }), HEAT_CONDUCTION_ERROR.UNKNOWN_MATERIAL);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: 50, thicknessMm: 10, materialId: OZEL_ID }), HEAT_CONDUCTION_ERROR.INVALID_CUSTOM_K);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: 50, thicknessMm: 10, materialId: OZEL_ID, customK: 0 }), HEAT_CONDUCTION_ERROR.INVALID_CUSTOM_K);
    expectError(solveHeatConduction({ areaM2: NaN, deltaT: 50, thicknessMm: 10, materialId: 'bakir' }), HEAT_CONDUCTION_ERROR.INVALID_NUMBER);
    expectError(solveHeatConduction({ areaM2: 2, deltaT: Infinity, thicknessMm: 10, materialId: 'bakir' }), HEAT_CONDUCTION_ERROR.INVALID_NUMBER);
  });
});

describe('conductivity table & metadata', () => {
  it('exposes auditable textbook conductivities (W/m·K)', () => {
    expect(CONDUCTIVITY_MATERIALS.map((m) => [m.id, m.k])).toEqual([
      ['bakir', 401],
      ['aluminyum', 237],
      ['celik', 50],
      ['cam', 0.8],
      ['beton', 1.7],
      ['ahsap', 0.15],
      ['yalitim', 0.04],
      ['ozel', null],
    ]);
  });

  it('exposes the expected registry metadata', () => {
    expect(isiIletimiMeta.id).toBe('isi-iletimi');
    expect(isiIletimiMeta.slug).toBe('isi-iletimi-hesaplama');
    expect(isiIletimiMeta.categoryId).toBe('thermal');
    expect(isiIletimiMeta.formula).toBeUndefined();
    expect(isiIletimiMeta.faq?.length).toBe(2);
  });
});
