import { describe, it, expect } from 'vitest';
import {
  solveRadiator,
  radyatorDilimMeta,
  RADIATOR_ERROR,
  PANEL_TYPES,
  HIGH_LOAD_W,
  type RadiatorResult,
} from './radyator-dilim';

function expectError(result: RadiatorResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveRadiator — section count (round up)', () => {
  it('2000 W, PKKP (170 W/dilim) → 12 dilim (ceil 11.76)', () => {
    const r = solveRadiator({ loadW: 2000, panelType: 'pkkp' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sections).toBe(12);
    expect(r.sectionsExact).toBeCloseTo(2000 / 170, 9); // 11.7647
    expect(r.wPerSection).toBe(170);
    expect(r.panelLabel).toBe('PKKP (çift panel + çift konvektör)');
  });

  it('2000 W, PK (95 W/dilim) → 22 dilim (ceil 21.05)', () => {
    const r = solveRadiator({ loadW: 2000, panelType: 'pk' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sections).toBe(22);
    expect(r.sectionsExact).toBeCloseTo(2000 / 95, 9); // 21.0526
    expect(r.wPerSection).toBe(95);
  });

  it('1700 W, PKKP (170) → exactly 10 dilim (no rounding)', () => {
    const r = solveRadiator({ loadW: 1700, panelType: 'pkkp' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sections).toBe(10);
    expect(r.sectionsExact).toBeCloseTo(10, 9);
  });

  it('panel type changes the count: PKKP needs fewer dilim than PK for the same load', () => {
    const pkkp = solveRadiator({ loadW: 2000, panelType: 'pkkp' });
    const pkp = solveRadiator({ loadW: 2000, panelType: 'pkp' });
    const pk = solveRadiator({ loadW: 2000, panelType: 'pk' });
    expect(pkkp.ok && pkp.ok && pk.ok).toBe(true);
    if (!pkkp.ok || !pkp.ok || !pk.ok) return;
    // PKKP (170) < PKP (120) < PK (95) in W/dilim → more sections as output drops.
    expect(pkkp.sections).toBeLessThan(pkp.sections);
    expect(pkp.sections).toBeLessThan(pk.sections);
  });

  it('boundary: load exactly equal to one section output → 1 dilim', () => {
    for (const panel of PANEL_TYPES) {
      const r = solveRadiator({ loadW: panel.wPerSection, panelType: panel.id });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.sections).toBe(1);
      expect(r.sectionsExact).toBeCloseTo(1, 9);
    }
  });

  it('just above one section output rounds up to 2 dilim', () => {
    const r = solveRadiator({ loadW: 171, panelType: 'pkkp' }); // 171/170 = 1.0059 → 2
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sections).toBe(2);
  });

  it('very high load is still computed but carries a note', () => {
    const r = solveRadiator({ loadW: HIGH_LOAD_W + 1, panelType: 'pkkp' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sections).toBeGreaterThan(0);
    expect(r.note).toBeDefined();
  });
});

describe('solveRadiator — invalid input', () => {
  it('rejects non-positive / non-finite load and bad panel type', () => {
    expectError(solveRadiator({ loadW: 0, panelType: 'pkkp' }), RADIATOR_ERROR.NON_POSITIVE_LOAD);
    expectError(solveRadiator({ loadW: -500, panelType: 'pkkp' }), RADIATOR_ERROR.NON_POSITIVE_LOAD);
    expectError(solveRadiator({ loadW: NaN, panelType: 'pkkp' }), RADIATOR_ERROR.INVALID_NUMBER);
    expectError(solveRadiator({ loadW: Infinity, panelType: 'pkkp' }), RADIATOR_ERROR.INVALID_NUMBER);
    // @ts-expect-error — deliberately invalid panel type
    expectError(solveRadiator({ loadW: 2000, panelType: 'pkkkp' }), RADIATOR_ERROR.INVALID_PANEL_TYPE);
  });
});

describe('panel values & metadata', () => {
  it('exposes auditable per-section outputs (90/70 °C, approximate)', () => {
    expect(PANEL_TYPES.map((p) => [p.id, p.wPerSection])).toEqual([
      ['pk', 95],
      ['pkp', 120],
      ['pkkp', 170],
    ]);
  });

  it('exposes the expected registry metadata', () => {
    expect(radyatorDilimMeta.id).toBe('radyator-dilim');
    expect(radyatorDilimMeta.slug).toBe('radyator-dilim-hesaplama');
    expect(radyatorDilimMeta.categoryId).toBe('hvac');
    expect(radyatorDilimMeta.formula).toBeUndefined();
    expect(radyatorDilimMeta.faq?.length).toBe(2);
  });
});
