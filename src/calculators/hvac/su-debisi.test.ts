import { describe, it, expect } from 'vitest';
import { solveWaterFlow, suDebisiMeta, WATER_FLOW_ERROR, type WaterFlowResult } from './su-debisi';

function rowValue(result: WaterFlowResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const r = result.rows.find((x) => x.label === label);
  if (!r) throw new Error(`no row "${label}"`);
  return r.value;
}

function expectError(result: WaterFlowResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('solveWaterFlow — anchors', () => {
  it('d=50mm, v=2 → A≈0.00196350 m², Q≈14.1372 m³/h, 3.92699 L/s, 235.619 L/dk', () => {
    const r = solveWaterFlow({ diameterMm: 50, velocityMs: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.areaM2).toBeCloseTo(0.00196350, 7);
    expect(rowValue(r, 'Debi (m³/saat)')).toBe('14.1372');
    expect(rowValue(r, 'Debi (L/saniye)')).toBe('3.92699');
    expect(rowValue(r, 'Debi (L/dakika)')).toBe('235.619');
  });

  it('d=100mm, v=1.5 → Q≈42.4115 m³/h', () => {
    expect(rowValue(solveWaterFlow({ diameterMm: 100, velocityMs: 1.5 }), 'Debi (m³/saat)')).toBe('42.4115');
  });
});

describe('solveWaterFlow — invalid input', () => {
  it('rejects non-positive diameter / velocity and non-finite', () => {
    expectError(solveWaterFlow({ diameterMm: 0, velocityMs: 2 }), WATER_FLOW_ERROR.NON_POSITIVE_DIAMETER);
    expectError(solveWaterFlow({ diameterMm: -50, velocityMs: 2 }), WATER_FLOW_ERROR.NON_POSITIVE_DIAMETER);
    expectError(solveWaterFlow({ diameterMm: 50, velocityMs: 0 }), WATER_FLOW_ERROR.NON_POSITIVE_VELOCITY);
    expectError(solveWaterFlow({ diameterMm: NaN, velocityMs: 2 }), WATER_FLOW_ERROR.INVALID_NUMBER);
    expectError(solveWaterFlow({ diameterMm: 50, velocityMs: Infinity }), WATER_FLOW_ERROR.INVALID_NUMBER);
  });
});

describe('suDebisiMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(suDebisiMeta.id).toBe('su-debisi');
    expect(suDebisiMeta.slug).toBe('su-debisi-hesaplayici');
    expect(suDebisiMeta.categoryId).toBe('hvac');
    expect(suDebisiMeta.formula).toBeUndefined();
    expect(suDebisiMeta.faq?.length).toBe(2);
  });
});
