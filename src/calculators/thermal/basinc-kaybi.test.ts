import { describe, it, expect } from 'vitest';
import {
  solvePressureLoss,
  frictionFactor,
  basincKaybiMeta,
  PRESSURE_LOSS_ERROR,
  PIPE_ROUGHNESS,
  GRAVITY,
  type PressureLossResult,
} from './basinc-kaybi';
import { OZEL_ID } from './reynolds';

function expectError(result: PressureLossResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

// Reproduce the engine's exact formulas independently for cross-checking.
const reOf = (rho: number, mu: number, v: number, dM: number) => (rho * v * dM) / mu;
const swameeJain = (re: number, eps: number, dM: number) =>
  0.25 / Math.log10(eps / (3.7 * dM) + 5.74 / Math.pow(re, 0.9)) ** 2;
const darcyDP = (f: number, L: number, dM: number, rho: number, v: number) =>
  f * (L / dM) * ((rho * v * v) / 2);

describe('frictionFactor — laminar vs Swamee-Jain', () => {
  it('laminar (Re < 2300): f = 64/Re', () => {
    expect(frictionFactor(2000, 0.000045, 0.05)).toBeCloseTo(64 / 2000, 12); // 0.032
    expect(frictionFactor(1992.016, 0.000045, 0.05)).toBeCloseTo(64 / 1992.016, 12);
  });
  it('turbulent (Re ≥ 2300): matches the Swamee-Jain formula', () => {
    const f = frictionFactor(99600.8, 0.000045, 0.05);
    expect(f).toBeCloseTo(swameeJain(99600.8, 0.000045, 0.05), 12);
    expect(f).toBeCloseTo(0.022, 3); // commercial steel, Re≈1e5 → f≈0.022
  });
});

describe('solvePressureLoss — laminar anchor (su, D50, v0.04, L10, çelik)', () => {
  it('Re≈1992 (Laminer), f=64/Re, ΔP from Darcy-Weisbach', () => {
    const r = solvePressureLoss({
      fluidId: 'su',
      diameterMm: 50,
      velocityMs: 0.04,
      lengthM: 10,
      pipeId: 'celik',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const re = reOf(998, 0.001002, 0.04, 0.05); // 1992.0159
    expect(r.reynolds).toBeCloseTo(re, 6);
    expect(r.regime).toBe('Laminer');
    expect(r.frictionFactor).toBeCloseTo(64 / re, 12); // 0.0321282
    const dp = darcyDP(64 / re, 10, 0.05, 998, 0.04);
    expect(r.pressureDropPa).toBeCloseTo(dp, 9); // ≈5.1302 Pa
    expect(r.pressureDropPa).toBeCloseTo(5.1302, 3);
  });
});

describe('solvePressureLoss — turbulent anchor (su, D50, v2, L10, çelik)', () => {
  it('Re≈99600 (Türbülanslı), Swamee-Jain f≈0.022, ΔP≈8.78 kPa', () => {
    const r = solvePressureLoss({
      fluidId: 'su',
      diameterMm: 50,
      velocityMs: 2,
      lengthM: 10,
      pipeId: 'celik',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const re = reOf(998, 0.001002, 2, 0.05); // 99600.798
    const f = swameeJain(re, 0.000045, 0.05); // ≈0.0219973
    const dp = darcyDP(f, 10, 0.05, 998, 2); // ≈8781.3 Pa
    expect(r.reynolds).toBeCloseTo(re, 4);
    expect(r.regime).toBe('Türbülanslı');
    expect(r.frictionFactor).toBeCloseTo(f, 10);
    expect(r.frictionFactor).toBeCloseTo(0.022, 3);
    expect(r.pressureDropPa).toBeCloseTo(dp, 6);
    expect(r.pressureDropKPa).toBeCloseTo(dp / 1000, 9);
    expect(r.pressureDropBar).toBeCloseTo(dp / 100000, 12);
    expect(r.headLossM).toBeCloseTo(dp / (998 * GRAVITY), 9); // mSS
    expect(r.note).toBeUndefined(); // not transitional
  });

  it('rows expose Pa / kPa / bar / mSS in order', () => {
    const r = solvePressureLoss({ fluidId: 'su', diameterMm: 50, velocityMs: 2, lengthM: 10, pipeId: 'celik' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.label)).toEqual([
      'Basınç kaybı (Pa)',
      'Basınç kaybı (kPa)',
      'Basınç kaybı (bar)',
      'Yük kaybı (mSS)',
    ]);
  });
});

describe('solvePressureLoss — transition band note', () => {
  it('Re in [2300,4000] → Geçiş regime + transition note', () => {
    const r = solvePressureLoss({ fluidId: 'su', diameterMm: 50, velocityMs: 0.06, lengthM: 10, pipeId: 'celik' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reynolds).toBeCloseTo(reOf(998, 0.001002, 0.06, 0.05), 4); // ≈2988
    expect(r.regime).toBe('Geçiş (kritik) bölgesi');
    expect(r.note).toBeDefined();
  });
});

describe('solvePressureLoss — custom fluid + pipe lookups', () => {
  it('custom ρ,μ resolve via ozel; rougher pipe → higher f (turbulent)', () => {
    const r = solvePressureLoss({
      fluidId: OZEL_ID,
      customRho: 1000,
      customMu: 0.001,
      diameterMm: 100,
      velocityMs: 2,
      lengthM: 50,
      pipeId: 'dokme',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const smooth = solvePressureLoss({
      fluidId: OZEL_ID,
      customRho: 1000,
      customMu: 0.001,
      diameterMm: 100,
      velocityMs: 2,
      lengthM: 50,
      pipeId: 'cekme',
    });
    expect(smooth.ok).toBe(true);
    if (!smooth.ok) return;
    expect(r.frictionFactor).toBeGreaterThan(smooth.frictionFactor); // rougher ⇒ more friction
  });
});

describe('solvePressureLoss — invalid input', () => {
  it('rejects bad diameter / velocity / length / fluid / pipe / customs / non-finite', () => {
    const base = { fluidId: 'su', diameterMm: 50, velocityMs: 2, lengthM: 10, pipeId: 'celik' } as const;
    expectError(solvePressureLoss({ ...base, diameterMm: 0 }), PRESSURE_LOSS_ERROR.NON_POSITIVE_DIAMETER);
    expectError(solvePressureLoss({ ...base, velocityMs: 0 }), PRESSURE_LOSS_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solvePressureLoss({ ...base, lengthM: 0 }), PRESSURE_LOSS_ERROR.NON_POSITIVE_LENGTH);
    expectError(solvePressureLoss({ ...base, fluidId: 'civa' }), PRESSURE_LOSS_ERROR.UNKNOWN_FLUID);
    expectError(solvePressureLoss({ ...base, pipeId: 'altin' }), PRESSURE_LOSS_ERROR.UNKNOWN_PIPE);
    expectError(solvePressureLoss({ ...base, fluidId: OZEL_ID }), PRESSURE_LOSS_ERROR.INVALID_CUSTOM_RHO);
    expectError(
      solvePressureLoss({ ...base, fluidId: OZEL_ID, customRho: 1000 }),
      PRESSURE_LOSS_ERROR.INVALID_CUSTOM_MU,
    );
    expectError(solvePressureLoss({ ...base, diameterMm: NaN }), PRESSURE_LOSS_ERROR.INVALID_NUMBER);
    expectError(solvePressureLoss({ ...base, lengthM: Infinity }), PRESSURE_LOSS_ERROR.INVALID_NUMBER);
  });
});

describe('pipe roughness table & metadata', () => {
  it('exposes auditable roughness constants (ε in m)', () => {
    expect(PIPE_ROUGHNESS.map((p) => [p.id, p.eps])).toEqual([
      ['cekme', 0.0000015],
      ['celik', 0.000045],
      ['galvaniz', 0.00015],
      ['dokme', 0.00026],
      ['beton', 0.0003],
      ['pvc', 0.0000015],
    ]);
  });

  it('exposes the expected registry metadata (the forward-referenced id)', () => {
    expect(basincKaybiMeta.id).toBe('borudaki-basinc-kaybi');
    expect(basincKaybiMeta.slug).toBe('boru-basinc-kaybi-hesaplama');
    expect(basincKaybiMeta.categoryId).toBe('thermal');
    expect(basincKaybiMeta.formula).toBeUndefined();
    expect(basincKaybiMeta.faq?.length).toBe(2);
  });
});
