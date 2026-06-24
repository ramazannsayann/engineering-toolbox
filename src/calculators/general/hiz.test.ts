import { describe, it, expect } from 'vitest';
import { convertSpeed, hizMeta, SPEED_UNITS } from './hiz';
import { LINEAR_ERROR, type LinearResult } from './linear-convert';

function row(result: LinearResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const found = result.rows.find((r) => r.label === label);
  if (!found) throw new Error(`no row "${label}"`);
  return found.value;
}

function expectError(result: LinearResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('convertSpeed — anchors', () => {
  it('1 m/s → km/s 3.6, mph 2.23694, ft/s 3.28084, knot 1.94384', () => {
    const r = convertSpeed(1, 'mps');
    expect(row(r, 'Kilometre/saat (km/s)')).toBe('3.6');
    expect(row(r, 'Mil/saat (mph)')).toBe('2.23694');
    expect(row(r, 'Fit/saniye (ft/s)')).toBe('3.28084');
    expect(row(r, 'Knot (knot)')).toBe('1.94384');
  });

  it('100 km/s → m/s 27.7778, mph 62.1371', () => {
    const r = convertSpeed(100, 'kmh');
    expect(row(r, 'Metre/saniye (m/s)')).toBe('27.7778');
    expect(row(r, 'Mil/saat (mph)')).toBe('62.1371');
  });

  it('1 knot → km/s 1.852', () => {
    expect(row(convertSpeed(1, 'knot'), 'Kilometre/saat (km/s)')).toBe('1.852');
  });

  it('0 → all rows "0"', () => {
    const r = convertSpeed(0, 'mps');
    if (!r.ok) throw new Error('expected ok');
    for (const x of r.rows) expect(x.value).toBe('0');
  });
});

describe('convertSpeed — invalid input', () => {
  it('rejects negative, NaN, and unknown unit', () => {
    expectError(convertSpeed(-5, 'mps'), LINEAR_ERROR.NEGATIVE);
    expectError(convertSpeed(NaN, 'mps'), LINEAR_ERROR.INVALID_NUMBER);
    expectError(convertSpeed(1, 'mach'), LINEAR_ERROR.UNKNOWN_UNIT);
  });
});

describe('hizMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(hizMeta.id).toBe('hiz-donusturucu');
    expect(hizMeta.categoryId).toBe('general');
    expect(hizMeta.formula).toBeUndefined();
    expect(SPEED_UNITS.find((u) => u.id === 'knot')?.factorToBase).toBeCloseTo(0.514444, 6);
  });
});
