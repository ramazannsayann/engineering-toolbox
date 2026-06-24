import { describe, it, expect } from 'vitest';
import {
  solveCableSizing,
  cableSizingMeta,
  AMPACITY_A_30C,
  CABLE_SIZING_ERROR,
} from './kablo-kesiti';
import { STANDARD_CROSS_SECTIONS_MM2 } from './gerilim-dusumu';

type Result = ReturnType<typeof solveCableSizing>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

// ── Table integrity: every column aligns to the 15 standard sections and is
// strictly increasing; the B1<C<E and PVC<XLPE orderings hold. A wrong table
// edit (length, order, or ordering) fails here. ───────────────────────────────
describe('AMPACITY_A_30C table integrity (IEC 60364-5-52, copper, 30°C)', () => {
  const insulations = ['PVC', 'XLPE'] as const;
  const methods = ['B1', 'C', 'E'] as const;
  const counts = ['two', 'three'] as const;

  it('every column has 15 values aligned to STANDARD_CROSS_SECTIONS_MM2', () => {
    for (const ins of insulations) {
      for (const m of methods) {
        for (const c of counts) {
          expect(AMPACITY_A_30C[ins][m][c].length).toBe(STANDARD_CROSS_SECTIONS_MM2.length);
        }
      }
    }
  });

  it('each column is strictly increasing with cross-section', () => {
    for (const ins of insulations) {
      for (const m of methods) {
        for (const c of counts) {
          const col = AMPACITY_A_30C[ins][m][c];
          for (let i = 1; i < col.length; i++) {
            expect(col[i]).toBeGreaterThan(col[i - 1]);
          }
        }
      }
    }
  });

  it('respects B1 < C < E and PVC < XLPE orderings', () => {
    for (const ins of insulations) {
      for (const c of counts) {
        for (let i = 0; i < STANDARD_CROSS_SECTIONS_MM2.length; i++) {
          expect(AMPACITY_A_30C[ins].B1[c][i]).toBeLessThan(AMPACITY_A_30C[ins].C[c][i]);
          expect(AMPACITY_A_30C[ins].C[c][i]).toBeLessThan(AMPACITY_A_30C[ins].E[c][i]);
        }
      }
      // (handled per insulation above)
    }
    for (const m of methods) {
      for (const c of counts) {
        for (let i = 0; i < STANDARD_CROSS_SECTIONS_MM2.length; i++) {
          expect(AMPACITY_A_30C.PVC[m][c][i]).toBeLessThan(AMPACITY_A_30C.XLPE[m][c][i]);
        }
      }
    }
  });

  // Cited spot-checks (IEC 60364-5-52 reference-method values, copper, 30°C):
  it('matches sourced reference cells', () => {
    expect(AMPACITY_A_30C.PVC.C.three[7]).toBe(119); // PVC, C, 3-cond, 35 mm² = 119 A
    expect(AMPACITY_A_30C.PVC.C.two[1]).toBe(27); //    PVC, C, 2-cond, 2.5 mm² = 27 A
    expect(AMPACITY_A_30C.PVC.C.three[6]).toBe(96); //  PVC, C, 3-cond, 25 mm² = 96 A
    expect(AMPACITY_A_30C.PVC.B1.three[14]).toBe(346); // PVC, B1, 3-cond, 240 mm² = 346 A
    expect(AMPACITY_A_30C.XLPE.E.three[0]).toBe(23); //  XLPE, E, 3-cond, 1.5 mm² = 23 A
  });
});

describe('solveCableSizing — ampacity-governed', () => {
  // 3φ PVC method C, 100 A, 400 V, short 5 m run, 5% limit.
  // Ampacity (PVC,C,3-cond): 25 mm² = 96 A < 100; 35 mm² = 119 A ≥ 100 → 35 mm².
  // VD at 5 m is tiny → 1.5 mm² already passes. Larger pick (35) governs.
  it('short run → recommended = ampacity pick (35 mm²), governing = ampasite', () => {
    const result = solveCableSizing({
      phase: 3,
      loadCurrentA: 100,
      voltageV: 400,
      lengthM: 5,
      insulation: 'PVC',
      method: 'C',
      maxVoltageDropPercent: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.ampacityPickMm2).toBe(35);
    expect(result.values.voltageDropPickMm2).toBe(1.5);
    expect(result.values.recommendedMm2).toBe(35);
    expect(result.values.recommendedAmpacityA).toBe(119); // IEC: PVC C 3-cond 35 mm²
    expect(result.values.governingCriterion).toBe('ampasite');
    expect(result.values.recommendedDropPercent).toBeLessThan(5);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('solveCableSizing — voltage-drop-governed', () => {
  // 1φ PVC method C, 20 A, 230 V, long 100 m run, 3% limit.
  // Ampacity (PVC,C,2-cond): 2.5 mm² = 27 A ≥ 20 → 2.5 mm².
  // VD: 10 mm² → 3.04% (>3); 16 mm² → 1.90% (≤3) → 16 mm². Larger (16) governs.
  it('long run → recommended = VD pick (16 mm²), governing = gerilim düşümü', () => {
    const result = solveCableSizing({
      phase: 1,
      loadCurrentA: 20,
      voltageV: 230,
      lengthM: 100,
      insulation: 'PVC',
      method: 'C',
      maxVoltageDropPercent: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.ampacityPickMm2).toBe(2.5); // IEC: PVC C 2-cond 2.5 mm² = 27 A
    expect(result.values.voltageDropPickMm2).toBe(16);
    expect(result.values.recommendedMm2).toBe(16);
    expect(result.values.governingCriterion).toBe('gerilim düşümü');
    expect(result.values.recommendedDropPercent).toBeLessThanOrEqual(3);
  });
});

describe('solveCableSizing — boundary (load exactly at a rating)', () => {
  const base = {
    phase: 3 as const,
    voltageV: 400,
    lengthM: 5,
    insulation: 'PVC' as const,
    method: 'C' as const,
    maxVoltageDropPercent: 5,
  };
  it('load = exact rating qualifies that section (inclusive ≥)', () => {
    // PVC C 3-cond 25 mm² = 96 A.
    const result = solveCableSizing({ ...base, loadCurrentA: 96 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.ampacityPickMm2).toBe(25);
    expect(result.values.recommendedMm2).toBe(25);
  });
  it('load just above a rating steps up to the next section', () => {
    const result = solveCableSizing({ ...base, loadCurrentA: 97 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.ampacityPickMm2).toBe(35);
  });
});

describe('solveCableSizing — invalid input', () => {
  const base = {
    phase: 3,
    loadCurrentA: 50,
    voltageV: 400,
    lengthM: 20,
    insulation: 'PVC' as const,
    method: 'C' as const,
    maxVoltageDropPercent: 5,
  };

  it('rejects invalid phase / insulation / method', () => {
    expectError(solveCableSizing({ ...base, phase: 2 }), CABLE_SIZING_ERROR.INVALID_PHASE);
    // @ts-expect-error bad insulation at runtime
    expectError(solveCableSizing({ ...base, insulation: 'RUBBER' }), CABLE_SIZING_ERROR.INVALID_INSULATION);
    // @ts-expect-error bad method at runtime
    expectError(solveCableSizing({ ...base, method: 'D' }), CABLE_SIZING_ERROR.INVALID_METHOD);
  });

  it('rejects zero / negative current, voltage, length', () => {
    expectError(solveCableSizing({ ...base, loadCurrentA: 0 }), CABLE_SIZING_ERROR.NON_POSITIVE_VALUE);
    expectError(solveCableSizing({ ...base, voltageV: -400 }), CABLE_SIZING_ERROR.NON_POSITIVE_VALUE);
    expectError(solveCableSizing({ ...base, lengthM: -1 }), CABLE_SIZING_ERROR.NON_POSITIVE_VALUE);
  });

  it('rejects non-finite values', () => {
    expectError(solveCableSizing({ ...base, loadCurrentA: NaN }), CABLE_SIZING_ERROR.INVALID_NUMBER);
    expectError(solveCableSizing({ ...base, lengthM: Infinity }), CABLE_SIZING_ERROR.INVALID_NUMBER);
  });

  it('rejects % limit out of range', () => {
    expectError(solveCableSizing({ ...base, maxVoltageDropPercent: 0 }), CABLE_SIZING_ERROR.PERCENT_RANGE);
    expectError(solveCableSizing({ ...base, maxVoltageDropPercent: 101 }), CABLE_SIZING_ERROR.PERCENT_RANGE);
  });

  it('rejects load exceeding the largest section rating', () => {
    // PVC B1 3-cond largest (240 mm²) = 346 A.
    expectError(
      solveCableSizing({ ...base, method: 'B1', loadCurrentA: 400 }),
      CABLE_SIZING_ERROR.AMPACITY_EXCEEDED,
    );
  });

  it('rejects when even the largest section cannot meet the % limit', () => {
    expectError(
      solveCableSizing({
        phase: 1,
        loadCurrentA: 100,
        voltageV: 230,
        lengthM: 1000,
        insulation: 'PVC',
        method: 'C',
        maxVoltageDropPercent: 1,
      }),
      CABLE_SIZING_ERROR.VD_LIMIT_UNREACHABLE,
    );
  });
});

describe('cableSizingMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(cableSizingMeta.id).toBe('kablo-kesiti');
    expect(cableSizingMeta.slug).toBe('kablo-kesiti-hesaplayici');
    expect(cableSizingMeta.categoryId).toBe('electrical');
  });
});
