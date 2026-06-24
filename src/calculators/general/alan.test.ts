import { describe, it, expect } from 'vitest';
import { convertArea, alanMeta, AREA_UNITS } from './alan';
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

describe('convertArea — anchors', () => {
  it('1 m² → cm² 10000, ft² 10.7639, dönüm 0.001, ha 0.0001', () => {
    const r = convertArea(1, 'm2');
    expect(row(r, 'Santimetrekare (cm²)')).toBe('10000');
    expect(row(r, 'Ayakkare (ft²)')).toBe('10.7639');
    expect(row(r, 'Dönüm (dönüm)')).toBe('0.001');
    expect(row(r, 'Hektar (ha)')).toBe('0.0001');
  });

  it('1 dönüm → m² 1000', () => {
    expect(row(convertArea(1, 'donum'), 'Metrekare (m²)')).toBe('1000');
  });

  it('1 ha → m² 10000, dönüm 10', () => {
    const r = convertArea(1, 'ha');
    expect(row(r, 'Metrekare (m²)')).toBe('10000');
    expect(row(r, 'Dönüm (dönüm)')).toBe('10');
  });

  it('1 akre → m² 4046.86', () => {
    expect(row(convertArea(1, 'akre'), 'Metrekare (m²)')).toBe('4046.86');
  });

  it('0 → all rows "0"', () => {
    const r = convertArea(0, 'm2');
    if (!r.ok) throw new Error('expected ok');
    for (const x of r.rows) expect(x.value).toBe('0');
  });
});

describe('convertArea — invalid input', () => {
  it('rejects negative, NaN, and unknown unit', () => {
    expectError(convertArea(-5, 'm2'), LINEAR_ERROR.NEGATIVE);
    expectError(convertArea(NaN, 'm2'), LINEAR_ERROR.INVALID_NUMBER);
    expectError(convertArea(1, 'square-cubit'), LINEAR_ERROR.UNKNOWN_UNIT);
  });
});

describe('alanMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(alanMeta.id).toBe('alan-donusturucu');
    expect(alanMeta.categoryId).toBe('general');
    expect(alanMeta.formula).toBeUndefined();
    expect(AREA_UNITS.find((u) => u.id === 'akre')?.factorToBase).toBe(4046.8564224);
  });
});
