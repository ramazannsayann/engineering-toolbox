import { describe, it, expect } from 'vitest';
import { convertWeight, agirlikMeta, WEIGHT_UNITS } from './agirlik';
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

describe('convertWeight — anchors', () => {
  it('1 kg → g 1000, lb 2.20462, oz 35.274, ton 0.001, mg 1000000', () => {
    const r = convertWeight(1, 'kg');
    expect(row(r, 'Gram (g)')).toBe('1000');
    expect(row(r, 'Libre (lb)')).toBe('2.20462');
    expect(row(r, 'Ons (oz)')).toBe('35.274');
    expect(row(r, 'Ton (t)')).toBe('0.001');
    expect(row(r, 'Miligram (mg)')).toBe('1000000');
    expect(r.ok && r.rows.some((x) => x.label === 'Kilogram (kg)')).toBe(false); // source excluded
  });

  it('1 lb → kg 0.453592, g 453.592, oz 16', () => {
    const r = convertWeight(1, 'lb');
    expect(row(r, 'Kilogram (kg)')).toBe('0.453592');
    expect(row(r, 'Gram (g)')).toBe('453.592');
    expect(row(r, 'Ons (oz)')).toBe('16'); // 1 lb = 16 oz exactly
  });

  it('1 oz → g 28.3495', () => {
    expect(row(convertWeight(1, 'oz'), 'Gram (g)')).toBe('28.3495');
  });

  it('0 → all rows "0"', () => {
    const r = convertWeight(0, 'kg');
    if (!r.ok) throw new Error('expected ok');
    for (const x of r.rows) expect(x.value).toBe('0');
  });
});

describe('convertWeight — invalid input', () => {
  it('rejects negative, NaN, and unknown unit', () => {
    expectError(convertWeight(-5, 'kg'), LINEAR_ERROR.NEGATIVE);
    expectError(convertWeight(NaN, 'kg'), LINEAR_ERROR.INVALID_NUMBER);
    expectError(convertWeight(1, 'stone'), LINEAR_ERROR.UNKNOWN_UNIT);
  });
});

describe('agirlikMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(agirlikMeta.id).toBe('agirlik-donusturucu');
    expect(agirlikMeta.categoryId).toBe('general');
    expect(agirlikMeta.formula).toBeUndefined();
    expect(WEIGHT_UNITS.find((u) => u.id === 'lb')?.factorToBase).toBe(453.59237);
  });
});
