import { describe, it, expect } from 'vitest';
import { convertLength, uzunlukMeta, LENGTH_UNITS } from './uzunluk';
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

describe('convertLength — anchors', () => {
  it('1 m → cm 100, mm 1000, km 0.001, inç 39.3701, ft 3.28084, yd 1.09361, mil 0.000621371', () => {
    const r = convertLength(1, 'm');
    expect(row(r, 'Santimetre (cm)')).toBe('100');
    expect(row(r, 'Milimetre (mm)')).toBe('1000');
    expect(row(r, 'Kilometre (km)')).toBe('0.001');
    expect(row(r, 'İnç (inç)')).toBe('39.3701');
    expect(row(r, 'Fit (ft)')).toBe('3.28084');
    expect(row(r, 'Yarda (yd)')).toBe('1.09361');
    expect(row(r, 'Mil (mil)')).toBe('0.000621371');
  });

  it('the source unit (Metre) is excluded from the rows', () => {
    const r = convertLength(1, 'm');
    if (!r.ok) throw new Error('expected ok');
    expect(r.rows.some((x) => x.label === 'Metre (m)')).toBe(false);
    expect(r.rows.length).toBe(LENGTH_UNITS.length - 1);
  });

  it('1 inç → cm 2.54, mm 25.4, m 0.0254', () => {
    const r = convertLength(1, 'inch');
    expect(row(r, 'Santimetre (cm)')).toBe('2.54');
    expect(row(r, 'Milimetre (mm)')).toBe('25.4');
    expect(row(r, 'Metre (m)')).toBe('0.0254');
  });

  it('1 ft → inç 12, cm 30.48, m 0.3048', () => {
    const r = convertLength(1, 'ft');
    expect(row(r, 'İnç (inç)')).toBe('12');
    expect(row(r, 'Santimetre (cm)')).toBe('30.48');
    expect(row(r, 'Metre (m)')).toBe('0.3048');
  });

  it('1 km → mil 0.621371, m 1000', () => {
    const r = convertLength(1, 'km');
    expect(row(r, 'Mil (mil)')).toBe('0.621371');
    expect(row(r, 'Metre (m)')).toBe('1000');
  });

  it('0 → all rows "0"', () => {
    const r = convertLength(0, 'm');
    if (!r.ok) throw new Error('expected ok');
    for (const x of r.rows) expect(x.value).toBe('0');
  });

  it('2.5 m → cm 250', () => {
    expect(row(convertLength(2.5, 'm'), 'Santimetre (cm)')).toBe('250');
  });
});

describe('convertLength — invalid input', () => {
  it('rejects negative, NaN, and unknown unit', () => {
    expectError(convertLength(-5, 'm'), LINEAR_ERROR.NEGATIVE);
    expectError(convertLength(NaN, 'm'), LINEAR_ERROR.INVALID_NUMBER);
    expectError(convertLength(1, 'parsec'), LINEAR_ERROR.UNKNOWN_UNIT);
  });
});

describe('uzunlukMeta', () => {
  it('exposes the expected registry metadata (categoryId general, no formula)', () => {
    expect(uzunlukMeta.id).toBe('uzunluk-donusturucu');
    expect(uzunlukMeta.slug).toBe('uzunluk-donusturucu');
    expect(uzunlukMeta.categoryId).toBe('general');
    expect(uzunlukMeta.formula).toBeUndefined();
    expect(uzunlukMeta.faq?.length).toBe(2);
  });
});
