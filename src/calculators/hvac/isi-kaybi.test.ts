import { describe, it, expect } from 'vitest';
import {
  solveHeatLoss,
  isiKaybiMeta,
  HEAT_LOSS_ERROR,
  BASE_W_PER_M3_PER_K,
  WINDOW_W_PER_M2_PER_K,
  INSULATION_FACTOR,
  EXPOSURE_FACTOR,
  type HeatLossDetailedInput,
  type HeatLossResult,
} from './isi-kaybi';
import { KW_TO_KCAL_PER_H } from './power-units';

function expectError(result: HeatLossResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

const DETAILED_BASE: HeatLossDetailedInput = {
  mode: 'detailed',
  areaM2: 20,
  ceilingM: 2.7,
  deltaT: 30,
  insulation: 'orta',
  windowAreaM2: 0,
  exposure: 'normal',
};

describe('solveHeatLoss — Simple mode', () => {
  it('20 m², 2.7 m, ΔT 30 → 810 W = 0.81 kW ≈ 696.47 kcal/saat', () => {
    // volume 20×2.7=54; base 54×30×0.5=810; orta×normal=1; window default 0 → 810 W.
    const r = solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalW).toBeCloseTo(810, 6);
    expect(r.kW).toBeCloseTo(0.81, 9);
    expect(r.kcalPerH).toBeCloseTo(0.81 * KW_TO_KCAL_PER_H, 6); // 696.47445
    expect(r.kcalPerH).toBeCloseTo(696.47445, 4);
  });

  it('heating load scales linearly with ΔT (double ΔT → double load)', () => {
    const r30 = solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: 30 });
    const r60 = solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: 60 });
    expect(r30.ok && r60.ok).toBe(true);
    if (!r30.ok || !r60.ok) return;
    expect(r60.totalW).toBeCloseTo(2 * r30.totalW, 6); // 1620 = 2×810
    expect(r60.totalW).toBeCloseTo(1620, 6);
  });

  it('rows expose kW / BTU·h / kcal·h', () => {
    const r = solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: 30 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.label)).toEqual(['Kilovat (kW)', 'BTU/saat', 'kcal/saat']);
  });
});

describe('solveHeatLoss — Detailed mode', () => {
  it('breakdown line items sum to totalW', () => {
    // referenceBase 810; base 810×1.3×1.15=1210.95; fabricAdj 400.95;
    // window 4×30×3=360; total 1570.95.
    const r = solveHeatLoss({
      ...DETAILED_BASE,
      insulation: 'zayif',
      windowAreaM2: 4,
      exposure: 'kose',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const sum = r.breakdown.reduce((acc, x) => acc + x.watts, 0);
    expect(sum).toBeCloseTo(r.totalW, 6);
    expect(r.totalW).toBeCloseTo(1570.95, 4);
    expect(r.kW).toBeCloseTo(1.57095, 6);
  });

  it('insulation changes the total: zayıf > orta > iyi', () => {
    const load = (i: HeatLossDetailedInput['insulation']) => {
      const r = solveHeatLoss({ ...DETAILED_BASE, windowAreaM2: 2, insulation: i });
      if (!r.ok) throw new Error('expected ok');
      return r.totalW;
    };
    expect(load('zayif')).toBeGreaterThan(load('orta')); // 1.3 > 1.0
    expect(load('orta')).toBeGreaterThan(load('iyi')); // 1.0 > 0.8
  });

  it('exposure changes the total: köşe > normal', () => {
    const load = (e: HeatLossDetailedInput['exposure']) => {
      const r = solveHeatLoss({ ...DETAILED_BASE, windowAreaM2: 2, exposure: e });
      if (!r.ok) throw new Error('expected ok');
      return r.totalW;
    };
    expect(load('kose')).toBeGreaterThan(load('normal')); // 1.15 > 1.0
  });

  it('adding window area increases the load (additive window term)', () => {
    const noWindow = solveHeatLoss({ ...DETAILED_BASE, windowAreaM2: 0 });
    const withWindow = solveHeatLoss({ ...DETAILED_BASE, windowAreaM2: 6 });
    expect(noWindow.ok && withWindow.ok).toBe(true);
    if (!noWindow.ok || !withWindow.ok) return;
    // extra = 6 × 30 × 3 = 540 W.
    expect(withWindow.totalW - noWindow.totalW).toBeCloseTo(540, 6);
  });
});

describe('solveHeatLoss — mode consistency', () => {
  it('Simple equals Detailed with the same defaults (modes agree)', () => {
    const simple = solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: 30 });
    const detailed = solveHeatLoss(DETAILED_BASE);
    expect(simple.ok && detailed.ok).toBe(true);
    if (!simple.ok || !detailed.ok) return;
    expect(simple.totalW).toBeCloseTo(detailed.totalW, 9); // exact: Simple = Detailed(defaults)
  });
});

describe('solveHeatLoss — invalid input', () => {
  it('rejects bad area / ceiling / ΔT / negatives / enums / non-finite', () => {
    expectError(solveHeatLoss({ mode: 'simple', areaM2: 0, ceilingM: 2.7, deltaT: 30 }), HEAT_LOSS_ERROR.NON_POSITIVE_AREA);
    expectError(solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 0, deltaT: 30 }), HEAT_LOSS_ERROR.NON_POSITIVE_CEILING);
    expectError(solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: 0 }), HEAT_LOSS_ERROR.NON_POSITIVE_DELTA_T);
    expectError(solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: -5 }), HEAT_LOSS_ERROR.NON_POSITIVE_DELTA_T);
    expectError(solveHeatLoss({ ...DETAILED_BASE, windowAreaM2: -2 }), HEAT_LOSS_ERROR.NEGATIVE_VALUE);
    expectError(solveHeatLoss({ mode: 'simple', areaM2: NaN, ceilingM: 2.7, deltaT: 30 }), HEAT_LOSS_ERROR.INVALID_NUMBER);
    expectError(solveHeatLoss({ mode: 'simple', areaM2: 20, ceilingM: 2.7, deltaT: Infinity }), HEAT_LOSS_ERROR.INVALID_NUMBER);
    // @ts-expect-error — deliberately invalid enum
    expectError(solveHeatLoss({ ...DETAILED_BASE, insulation: 'mukemmel' }), HEAT_LOSS_ERROR.INVALID_ENUM);
    // @ts-expect-error — deliberately invalid enum
    expectError(solveHeatLoss({ ...DETAILED_BASE, exposure: 'orta-cephe' }), HEAT_LOSS_ERROR.INVALID_ENUM);
  });
});

describe('coefficients & metadata', () => {
  it('exposes auditable coefficient constants', () => {
    expect(BASE_W_PER_M3_PER_K).toBe(0.5);
    expect(WINDOW_W_PER_M2_PER_K).toBe(3.0);
    expect(INSULATION_FACTOR).toEqual({ iyi: 0.8, orta: 1.0, zayif: 1.3 });
    expect(EXPOSURE_FACTOR).toEqual({ normal: 1.0, kose: 1.15 });
  });

  it('exposes the expected registry metadata', () => {
    expect(isiKaybiMeta.id).toBe('isi-kaybi');
    expect(isiKaybiMeta.slug).toBe('isi-kaybi-hesaplama');
    expect(isiKaybiMeta.categoryId).toBe('hvac');
    expect(isiKaybiMeta.formula).toBeUndefined();
    expect(isiKaybiMeta.faq?.length).toBe(2);
  });
});
