import { describe, it, expect } from 'vitest';
import {
  solveFlowRate,
  debiMeta,
  FLOW_RATE_ERROR,
  M3S_TO_M3H,
  M3S_TO_LMIN,
  M3S_TO_LS,
  type FlowRateResult,
} from './debi';

function expectError(result: FlowRateResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveFlowRate — Q = A·v anchors', () => {
  it('D=50mm, v=2 → 14.1372 m³/saat (3.92699 L/s, 235.619 L/dk)', () => {
    const r = solveFlowRate({ diameterMm: 50, velocityMs: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const expectedArea = Math.PI * 0.025 ** 2; // 0.0019634954…
    expect(r.areaM2).toBeCloseTo(expectedArea, 9);
    expect(r.m3PerHour).toBeCloseTo(14.1372, 4);
    expect(r.lPerSec).toBeCloseTo(3.92699, 5);
    expect(r.lPerMin).toBeCloseTo(235.619, 3);
  });

  it('D=100mm, v=1.5 → 42.4115 m³/saat', () => {
    const r = solveFlowRate({ diameterMm: 100, velocityMs: 1.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.m3PerHour).toBeCloseTo(42.4115, 4);
  });

  it('rows are derived from m³/s by the documented factors', () => {
    const r = solveFlowRate({ diameterMm: 50, velocityMs: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.label)).toEqual([
      'Debi (m³/saat)',
      'Debi (litre/dakika)',
      'Debi (litre/saniye)',
    ]);
    expect(r.m3PerHour).toBeCloseTo(r.m3PerSec * M3S_TO_M3H, 9);
    expect(r.lPerMin).toBeCloseTo(r.m3PerSec * M3S_TO_LMIN, 9);
    expect(r.lPerSec).toBeCloseTo(r.m3PerSec * M3S_TO_LS, 9);
  });
});

describe('solveFlowRate — invalid input', () => {
  it('rejects bad diameter / velocity / non-finite', () => {
    expectError(solveFlowRate({ diameterMm: 0, velocityMs: 2 }), FLOW_RATE_ERROR.NON_POSITIVE_DIAMETER);
    expectError(solveFlowRate({ diameterMm: -50, velocityMs: 2 }), FLOW_RATE_ERROR.NON_POSITIVE_DIAMETER);
    expectError(solveFlowRate({ diameterMm: 50, velocityMs: 0 }), FLOW_RATE_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solveFlowRate({ diameterMm: 50, velocityMs: -2 }), FLOW_RATE_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solveFlowRate({ diameterMm: NaN, velocityMs: 2 }), FLOW_RATE_ERROR.INVALID_NUMBER);
    expectError(solveFlowRate({ diameterMm: 50, velocityMs: Infinity }), FLOW_RATE_ERROR.INVALID_NUMBER);
  });
});

describe('flow-rate metadata', () => {
  it('exposes the expected registry metadata (separate from HVAC su-debisi)', () => {
    expect(debiMeta.id).toBe('debi-hesaplama');
    expect(debiMeta.slug).toBe('debi-hesaplama');
    expect(debiMeta.categoryId).toBe('thermal');
    expect(debiMeta.formula).toBeUndefined();
    expect(debiMeta.faq?.length).toBe(2);
  });
});
