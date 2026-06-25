import { describe, it, expect } from 'vitest';
import { solvePipeDiameter, boruCapiMeta, PIPE_DIAMETER_ERROR, type PipeDiameterResult } from './boru-capi';

function expectError(result: PipeDiameterResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solvePipeDiameter — anchors', () => {
  it('Q=14.1372 m³/h, v=2 → d≈50.0 mm, DN50 (inverse of the flow anchor)', () => {
    const r = solvePipeDiameter({ flowM3h: 14.1372, velocityMs: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiredDiameterMm).toBeCloseTo(50.0, 2);
    expect(r.recommendedDN).toBe(50);
  });

  it('Q=10 m³/h, v=1.5 → d≈48.5577 mm, DN50', () => {
    const r = solvePipeDiameter({ flowM3h: 10, velocityMs: 1.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiredDiameterMm).toBeCloseTo(48.5577, 3);
    expect(r.recommendedDN).toBe(50);
  });

  it('Q=10 m³/h, v=2 → d≈42.07 mm, DN50', () => {
    const r = solvePipeDiameter({ flowM3h: 10, velocityMs: 2 });
    expect(r.ok && r.requiredDiameterMm).toBeCloseTo(42.07, 1);
    expect(r.ok && r.recommendedDN).toBe(50);
  });

  it('over-range: Q=5000 m³/h, v=1 → d>300 mm → DN null + note', () => {
    const r = solvePipeDiameter({ flowM3h: 5000, velocityMs: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiredDiameterMm).toBeGreaterThan(300);
    expect(r.recommendedDN).toBeNull();
    expect(r.note).toBeDefined();
  });
});

describe('solvePipeDiameter — invalid input', () => {
  it('rejects non-positive flow/velocity and non-finite', () => {
    expectError(solvePipeDiameter({ flowM3h: 0, velocityMs: 2 }), PIPE_DIAMETER_ERROR.NON_POSITIVE_FLOW);
    expectError(solvePipeDiameter({ flowM3h: 10, velocityMs: 0 }), PIPE_DIAMETER_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solvePipeDiameter({ flowM3h: NaN, velocityMs: 2 }), PIPE_DIAMETER_ERROR.INVALID_NUMBER);
  });
});

describe('boruCapiMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(boruCapiMeta.id).toBe('boru-capi');
    expect(boruCapiMeta.slug).toBe('boru-capi-hesaplayici');
    expect(boruCapiMeta.categoryId).toBe('hvac');
    expect(boruCapiMeta.formula).toBeUndefined();
    expect(boruCapiMeta.faq?.length).toBe(2);
  });
});
