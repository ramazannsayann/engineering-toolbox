import { describe, it, expect } from 'vitest';
import {
  solveHeatTransfer,
  isiTransferiMeta,
  HEAT_TRANSFER_ERROR,
  SPECIFIC_HEATS,
  OZEL_ID,
  J_PER_KJ,
  J_PER_KWH,
  J_PER_KCAL,
  type HeatTransferResult,
} from './isi-transferi';

function expectError(result: HeatTransferResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveHeatTransfer — Q = m·c·ΔT anchors', () => {
  it('1 kg water, ΔT 80 → 334880 J = 334.88 kJ ≈ 0.0930222 kWh ≈ 80 kcal', () => {
    const r = solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: 'su' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.joules).toBeCloseTo(334880, 6); // 1×4186×80
    expect(r.kJ).toBeCloseTo(334.88, 6);
    expect(r.kWh).toBeCloseTo(334880 / 3_600_000, 9); // 0.09302222…
    expect(r.kcal).toBeCloseTo(80, 9); // 334880/4186 = 80 exactly
    expect(r.cUsed).toBe(4186);
    expect(r.materialLabel).toBe('Su');
  });

  it('10 kg water, ΔT 50 → 2,093,000 J = 2093 kJ', () => {
    const r = solveHeatTransfer({ massKg: 10, deltaT: 50, materialId: 'su' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.joules).toBeCloseTo(2_093_000, 6); // 10×4186×50
    expect(r.kJ).toBeCloseTo(2093, 6);
  });

  it('5 kg iron, ΔT 100 → 224,500 J = 224.5 kJ', () => {
    const r = solveHeatTransfer({ massKg: 5, deltaT: 100, materialId: 'demir' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.joules).toBeCloseTo(224_500, 6); // 5×449×100
    expect(r.kJ).toBeCloseTo(224.5, 6);
    expect(r.cUsed).toBe(449);
  });

  it('1 kg water, ΔT 1 → 4186 J (sanity)', () => {
    const r = solveHeatTransfer({ massKg: 1, deltaT: 1, materialId: 'su' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.joules).toBeCloseTo(4186, 9);
    expect(r.kcal).toBeCloseTo(1, 9); // 4186 J = 1 kcal
  });
});

describe('solveHeatTransfer — material lookup & custom c', () => {
  it('uses the looked-up c for each non-ozel material', () => {
    for (const m of SPECIFIC_HEATS) {
      if (m.c === null) continue;
      const r = solveHeatTransfer({ massKg: 2, deltaT: 10, materialId: m.id });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.cUsed).toBe(m.c);
      expect(r.joules).toBeCloseTo(2 * m.c * 10, 6);
    }
  });

  it('custom c (ozel): m=2, ΔT 10, customC=500 → 10,000 J = 10 kJ', () => {
    const r = solveHeatTransfer({ massKg: 2, deltaT: 10, materialId: OZEL_ID, customC: 500 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.joules).toBeCloseTo(10_000, 6); // 2×500×10
    expect(r.kJ).toBeCloseTo(10, 6);
    expect(r.cUsed).toBe(500);
    expect(r.materialLabel).toBe('Özel (elle gir)');
  });

  it('ignores a stray customC when a real material is selected', () => {
    const r = solveHeatTransfer({ massKg: 1, deltaT: 1, materialId: 'su', customC: 999 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cUsed).toBe(4186); // material wins; customC ignored
  });
});

describe('solveHeatTransfer — energy unit conversions', () => {
  it('rows expose kJ / kWh / kcal derived from joules', () => {
    const r = solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: 'su' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.label)).toEqual(['Enerji (kJ)', 'Enerji (kWh)', 'Enerji (kcal)']);
    expect(r.kJ).toBeCloseTo(r.joules / J_PER_KJ, 9);
    expect(r.kWh).toBeCloseTo(r.joules / J_PER_KWH, 12);
    expect(r.kcal).toBeCloseTo(r.joules / J_PER_KCAL, 9);
  });

  it('exposes the documented conversion constants', () => {
    expect(J_PER_KJ).toBe(1000);
    expect(J_PER_KWH).toBe(3_600_000);
    expect(J_PER_KCAL).toBe(4186);
  });
});

describe('solveHeatTransfer — invalid input', () => {
  it('rejects bad mass / ΔT / material / custom-c / non-finite', () => {
    expectError(solveHeatTransfer({ massKg: 0, deltaT: 80, materialId: 'su' }), HEAT_TRANSFER_ERROR.NON_POSITIVE_MASS);
    expectError(solveHeatTransfer({ massKg: -5, deltaT: 80, materialId: 'su' }), HEAT_TRANSFER_ERROR.NON_POSITIVE_MASS);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: 0, materialId: 'su' }), HEAT_TRANSFER_ERROR.NON_POSITIVE_DELTA);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: -10, materialId: 'su' }), HEAT_TRANSFER_ERROR.NON_POSITIVE_DELTA);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: 'plazma' }), HEAT_TRANSFER_ERROR.UNKNOWN_MATERIAL);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: OZEL_ID }), HEAT_TRANSFER_ERROR.INVALID_CUSTOM_C);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: OZEL_ID, customC: 0 }), HEAT_TRANSFER_ERROR.INVALID_CUSTOM_C);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: OZEL_ID, customC: -100 }), HEAT_TRANSFER_ERROR.INVALID_CUSTOM_C);
    expectError(solveHeatTransfer({ massKg: NaN, deltaT: 80, materialId: 'su' }), HEAT_TRANSFER_ERROR.INVALID_NUMBER);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: Infinity, materialId: 'su' }), HEAT_TRANSFER_ERROR.INVALID_NUMBER);
    expectError(solveHeatTransfer({ massKg: 1, deltaT: 80, materialId: OZEL_ID, customC: Infinity }), HEAT_TRANSFER_ERROR.INVALID_CUSTOM_C);
  });
});

describe('specific heats table & metadata', () => {
  it('exposes auditable standard specific-heat constants', () => {
    expect(SPECIFIC_HEATS.map((m) => [m.id, m.c])).toEqual([
      ['su', 4186],
      ['hava', 1005],
      ['demir', 449],
      ['bakir', 385],
      ['aluminyum', 897],
      ['beton', 880],
      ['cam', 840],
      ['ahsap', 1700],
      ['ozel', null],
    ]);
  });

  it('exposes the expected registry metadata', () => {
    expect(isiTransferiMeta.id).toBe('isi-transferi');
    expect(isiTransferiMeta.slug).toBe('isi-transferi-hesaplama');
    expect(isiTransferiMeta.categoryId).toBe('thermal');
    expect(isiTransferiMeta.formula).toBeUndefined();
    expect(isiTransferiMeta.faq?.length).toBe(2);
  });
});
