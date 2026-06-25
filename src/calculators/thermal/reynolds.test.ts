import { describe, it, expect } from 'vitest';
import {
  solveReynolds,
  regimeOf,
  reynoldsMeta,
  REYNOLDS_ERROR,
  FLUIDS,
  OZEL_ID,
  LAMINAR_MAX,
  TURBULENT_MIN,
  type ReynoldsResult,
} from './reynolds';

function expectError(result: ReynoldsResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveReynolds — Re = ρ·v·D/μ anchors', () => {
  it('water, v=2, D=50mm → Re ≈ 99600.8 (Türbülanslı)', () => {
    const r = solveReynolds({ velocityMs: 2, diameterMm: 50, fluidId: 'su' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo((998 * 2 * 0.05) / 0.001002, 2); // 99600.798…
    expect(r.reynolds).toBeCloseTo(99600.8, 1);
    expect(r.regime).toBe('Türbülanslı');
    expect(r.rhoUsed).toBe(998);
    expect(r.muUsed).toBe(0.001002);
  });

  it('water, v=0.01, D=10mm → Re ≈ 99.6 (Laminer)', () => {
    const r = solveReynolds({ velocityMs: 0.01, diameterMm: 10, fluidId: 'su' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo((998 * 0.01 * 0.01) / 0.001002, 4); // 99.6…
    expect(r.reynolds).toBeCloseTo(99.6008, 3);
    expect(r.regime).toBe('Laminer');
  });

  it('air, v=5, D=100mm → Re ≈ 33259.7 (Türbülanslı)', () => {
    const r = solveReynolds({ velocityMs: 5, diameterMm: 100, fluidId: 'hava' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo((1.204 * 5 * 0.1) / 0.0000181, 0); // 33259.6…
    expect(r.regime).toBe('Türbülanslı');
  });

  it('custom fluid ρ=1000, μ=0.001, v=1, D=100mm → Re = 100000', () => {
    const r = solveReynolds({
      velocityMs: 1,
      diameterMm: 100,
      fluidId: OZEL_ID,
      customRho: 1000,
      customMu: 0.001,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo(100000, 6);
    expect(r.regime).toBe('Türbülanslı');
  });
});

describe('solveReynolds — flow-regime boundaries', () => {
  // ozel ρ=1000, μ=0.001 → Re = 1e6 · v · D, so v·D pins Re exactly.
  const re = (velocityMs: number, diameterMm: number) =>
    solveReynolds({ velocityMs, diameterMm, fluidId: OZEL_ID, customRho: 1000, customMu: 0.001 });

  it('Re ≈ 2000 → Laminer (< 2300)', () => {
    const r = re(0.02, 100); // 1e6 × 0.02 × 0.1 = 2000
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo(2000, 6);
    expect(r.regime).toBe('Laminer');
  });

  it('Re ≈ 3000 → Geçiş (kritik) bölgesi (2300–4000)', () => {
    const r = re(0.03, 100); // 3000
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo(3000, 6);
    expect(r.regime).toBe('Geçiş (kritik) bölgesi');
  });

  it('Re ≈ 5000 → Türbülanslı (> 4000)', () => {
    const r = re(0.05, 100); // 5000
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo(5000, 6);
    expect(r.regime).toBe('Türbülanslı');
  });

  it('regimeOf classifies the documented thresholds', () => {
    expect(regimeOf(2299)).toBe('Laminer');
    expect(regimeOf(LAMINAR_MAX)).toBe('Geçiş (kritik) bölgesi'); // 2300 inclusive
    expect(regimeOf(3000)).toBe('Geçiş (kritik) bölgesi');
    expect(regimeOf(TURBULENT_MIN)).toBe('Geçiş (kritik) bölgesi'); // 4000 inclusive
    expect(regimeOf(4001)).toBe('Türbülanslı');
  });
});

describe('solveReynolds — material lookup uses table values', () => {
  it('each non-ozel fluid resolves to its table ρ and μ', () => {
    for (const f of FLUIDS) {
      if (f.rho === null || f.mu === null) continue;
      const r = solveReynolds({ velocityMs: 1, diameterMm: 50, fluidId: f.id });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.rhoUsed).toBe(f.rho);
      expect(r.muUsed).toBe(f.mu);
      expect(r.reynolds).toBeCloseTo((f.rho * 1 * 0.05) / f.mu, 6);
    }
  });
});

describe('solveReynolds — invalid input', () => {
  it('rejects bad velocity / diameter / fluid / customs / non-finite', () => {
    expectError(solveReynolds({ velocityMs: 0, diameterMm: 50, fluidId: 'su' }), REYNOLDS_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solveReynolds({ velocityMs: -2, diameterMm: 50, fluidId: 'su' }), REYNOLDS_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solveReynolds({ velocityMs: 2, diameterMm: 0, fluidId: 'su' }), REYNOLDS_ERROR.NON_POSITIVE_DIAMETER);
    expectError(solveReynolds({ velocityMs: 2, diameterMm: 50, fluidId: 'cisim' }), REYNOLDS_ERROR.UNKNOWN_FLUID);
    expectError(solveReynolds({ velocityMs: 2, diameterMm: 50, fluidId: OZEL_ID }), REYNOLDS_ERROR.INVALID_CUSTOM_RHO);
    expectError(
      solveReynolds({ velocityMs: 2, diameterMm: 50, fluidId: OZEL_ID, customRho: 1000 }),
      REYNOLDS_ERROR.INVALID_CUSTOM_MU,
    );
    expectError(
      solveReynolds({ velocityMs: 2, diameterMm: 50, fluidId: OZEL_ID, customRho: 0, customMu: 0.001 }),
      REYNOLDS_ERROR.INVALID_CUSTOM_RHO,
    );
    expectError(
      solveReynolds({ velocityMs: 2, diameterMm: 50, fluidId: OZEL_ID, customRho: 1000, customMu: -1 }),
      REYNOLDS_ERROR.INVALID_CUSTOM_MU,
    );
    expectError(solveReynolds({ velocityMs: NaN, diameterMm: 50, fluidId: 'su' }), REYNOLDS_ERROR.INVALID_NUMBER);
    expectError(solveReynolds({ velocityMs: 2, diameterMm: Infinity, fluidId: 'su' }), REYNOLDS_ERROR.INVALID_NUMBER);
  });
});

describe('fluids table & metadata', () => {
  it('exposes auditable textbook fluid properties (~20 °C)', () => {
    expect(FLUIDS.map((f) => [f.id, f.rho, f.mu])).toEqual([
      ['su', 998, 0.001002],
      ['hava', 1.204, 0.0000181],
      ['yag', 891, 0.29],
      ['ozel', null, null],
    ]);
  });

  it('exposes the expected registry metadata', () => {
    expect(reynoldsMeta.id).toBe('reynolds-sayisi');
    expect(reynoldsMeta.slug).toBe('reynolds-sayisi-hesaplama');
    expect(reynoldsMeta.categoryId).toBe('thermal');
    expect(reynoldsMeta.formula).toBeUndefined();
    expect(reynoldsMeta.faq?.length).toBe(2);
    expect(reynoldsMeta.relatedTools).not.toContain('reynolds-sayisi'); // no self-reference
  });
});
