import { describe, it, expect } from 'vitest';
import { convertVolume, hacimMeta, VOLUME_UNITS } from './hacim';
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

describe('convertVolume — anchors', () => {
  it('1 L → mL 1000, m³ 0.001, gal(ABD) 0.264172, cm³ 1000', () => {
    const r = convertVolume(1, 'l');
    expect(row(r, 'Mililitre (mL)')).toBe('1000');
    expect(row(r, 'Metreküp (m³)')).toBe('0.001');
    expect(row(r, 'ABD Galonu (gal)')).toBe('0.264172');
    expect(row(r, 'Santimetreküp (cm³)')).toBe('1000'); // 1 mL = 1 cm³
  });

  it('1 m³ → L 1000', () => {
    expect(row(convertVolume(1, 'm3'), 'Litre (L)')).toBe('1000');
  });

  it('1 gal(ABD) → L 3.78541', () => {
    expect(row(convertVolume(1, 'gal'), 'Litre (L)')).toBe('3.78541');
  });

  it('0 → all rows "0"', () => {
    const r = convertVolume(0, 'l');
    if (!r.ok) throw new Error('expected ok');
    for (const x of r.rows) expect(x.value).toBe('0');
  });
});

describe('convertVolume — invalid input', () => {
  it('rejects negative, NaN, and unknown unit', () => {
    expectError(convertVolume(-5, 'l'), LINEAR_ERROR.NEGATIVE);
    expectError(convertVolume(NaN, 'l'), LINEAR_ERROR.INVALID_NUMBER);
    expectError(convertVolume(1, 'barrel'), LINEAR_ERROR.UNKNOWN_UNIT);
  });
});

describe('hacimMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(hacimMeta.id).toBe('hacim-donusturucu');
    expect(hacimMeta.categoryId).toBe('general');
    expect(hacimMeta.formula).toBeUndefined();
    expect(VOLUME_UNITS.find((u) => u.id === 'gal')?.factorToBase).toBe(3.785411784);
  });
});
