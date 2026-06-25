import { describe, it, expect } from 'vitest';
import {
  solveAcBtu,
  klimaBtuMeta,
  AC_BTU_ERROR,
  BASE_W_PER_M3,
  PERSON_W,
  WINDOW_W_PER_M2,
  type AcBtuDetailedInput,
  type AcBtuResult,
} from './klima-btu';

function expectError(result: AcBtuResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

const DETAILED_BASE: AcBtuDetailedInput = {
  mode: 'detailed',
  areaM2: 20,
  ceilingM: 2.7,
  people: 2,
  highSun: false,
  deviceW: 300,
  windowAreaM2: 2,
  windowOrientation: 'guney',
  insulation: 'orta',
};

describe('solveAcBtu — Simple mode', () => {
  it('20 m², 2.7 m, 2 kişi, güneşsiz → 2386 W, ≈8141 BTU/h, önerilen 9000', () => {
    // base 20×2.7×35=1890, +100 (2nd person), +300 (device default),
    // +96 (window 2×60×0.8 default), ×1.0 (orta) = 2386 W.
    const r = solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 2.7, people: 2, highSun: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.totalW).toBeCloseTo(2386, 6);
    expect(r.btuPerHour).toBeCloseTo(8141.37, 1); // 2.386 × 3412.142
    expect(r.recommendedBtu).toBe(9000);
  });

  it('highSun=true increases the load (×1.15 on the base)', () => {
    const off = solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 2.7, people: 2, highSun: false });
    const on = solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 2.7, people: 2, highSun: true });
    expect(off.ok && on.ok).toBe(true);
    if (!off.ok || !on.ok) return;
    expect(on.totalW).toBeGreaterThan(off.totalW);
    expect(on.totalW).toBeCloseTo(2669.5, 6); // 1890×1.15 + 100 + 300 + 96 = 2669.5
  });
});

describe('solveAcBtu — Detailed mode', () => {
  it('breakdown line items sum to totalW', () => {
    const r = solveAcBtu({
      ...DETAILED_BASE,
      areaM2: 35,
      ceilingM: 3,
      people: 4,
      highSun: true,
      deviceW: 600,
      windowAreaM2: 6,
      insulation: 'zayif',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const sum = r.breakdown.reduce((acc, x) => acc + x.watts, 0);
    expect(sum).toBeCloseTo(r.totalW, 6);
    expect(r.totalW).toBeCloseTo(6226.3875, 4);
    expect(r.recommendedBtu).toBe(24000);
  });

  it('window orientation changes the contribution: kuzey < güney < batı', () => {
    const load = (o: AcBtuDetailedInput['windowOrientation']) => {
      const r = solveAcBtu({ ...DETAILED_BASE, windowAreaM2: 6, windowOrientation: o });
      if (!r.ok) throw new Error('expected ok');
      return r.totalW;
    };
    expect(load('kuzey')).toBeLessThan(load('guney')); // 0.6 < 0.8
    expect(load('guney')).toBeLessThan(load('bati')); // 0.8 < 1.0
  });

  it('insulation changes the total: zayıf > orta > iyi', () => {
    const load = (i: AcBtuDetailedInput['insulation']) => {
      const r = solveAcBtu({ ...DETAILED_BASE, insulation: i });
      if (!r.ok) throw new Error('expected ok');
      return r.totalW;
    };
    expect(load('zayif')).toBeGreaterThan(load('orta'));
    expect(load('orta')).toBeGreaterThan(load('iyi'));
  });
});

describe('solveAcBtu — mode consistency & recommendation ladder', () => {
  it('Simple equals Detailed with the same defaults (modes agree)', () => {
    const simple = solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 2.7, people: 2, highSun: false });
    const detailed = solveAcBtu(DETAILED_BASE);
    expect(simple.ok && detailed.ok).toBe(true);
    if (!simple.ok || !detailed.ok) return;
    expect(simple.totalW).toBeCloseTo(detailed.totalW, 9); // exact: Simple = Detailed(defaults)
  });

  it('recommendedBtu rounds UP to the standard ladder; >48000 → null + note', () => {
    const small = solveAcBtu({ mode: 'simple', areaM2: 10, ceilingM: 2.5, people: 1, highSun: false });
    expect(small.ok && small.recommendedBtu).toBe(9000); // small load → smallest size
    const big = solveAcBtu({
      ...DETAILED_BASE,
      areaM2: 200,
      ceilingM: 4,
      people: 20,
      highSun: true,
      deviceW: 5000,
      windowAreaM2: 40,
      windowOrientation: 'bati',
      insulation: 'zayif',
    });
    expect(big.ok).toBe(true);
    if (!big.ok) return;
    expect(big.recommendedBtu).toBeNull();
    expect(big.note).toBeDefined();
  });
});

describe('solveAcBtu — invalid input', () => {
  it('rejects bad area / ceiling / people / negatives / enums / non-finite', () => {
    expectError(solveAcBtu({ mode: 'simple', areaM2: 0, ceilingM: 2.7, people: 2, highSun: false }), AC_BTU_ERROR.NON_POSITIVE_AREA);
    expectError(solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 0, people: 2, highSun: false }), AC_BTU_ERROR.NON_POSITIVE_CEILING);
    expectError(solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 2.7, people: -1, highSun: false }), AC_BTU_ERROR.INVALID_PEOPLE);
    expectError(solveAcBtu({ mode: 'simple', areaM2: 20, ceilingM: 2.7, people: 2.5, highSun: false }), AC_BTU_ERROR.INVALID_PEOPLE);
    expectError(solveAcBtu({ ...DETAILED_BASE, deviceW: -100 }), AC_BTU_ERROR.NEGATIVE_VALUE);
    expectError(solveAcBtu({ ...DETAILED_BASE, windowAreaM2: -2 }), AC_BTU_ERROR.NEGATIVE_VALUE);
    expectError(solveAcBtu({ mode: 'simple', areaM2: NaN, ceilingM: 2.7, people: 2, highSun: false }), AC_BTU_ERROR.INVALID_NUMBER);
    // @ts-expect-error — deliberately invalid enum
    expectError(solveAcBtu({ ...DETAILED_BASE, insulation: 'mukemmel' }), AC_BTU_ERROR.INVALID_ENUM);
  });
});

describe('coefficients & metadata', () => {
  it('exposes auditable coefficient constants', () => {
    expect(BASE_W_PER_M3).toBe(35);
    expect(PERSON_W).toBe(100);
    expect(WINDOW_W_PER_M2).toBe(60);
  });

  it('exposes the expected registry metadata', () => {
    expect(klimaBtuMeta.id).toBe('klima-btu');
    expect(klimaBtuMeta.slug).toBe('klima-btu-hesaplama');
    expect(klimaBtuMeta.categoryId).toBe('hvac');
    expect(klimaBtuMeta.formula).toBeUndefined();
    expect(klimaBtuMeta.faq?.length).toBe(2);
  });
});
