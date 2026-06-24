import { describe, it, expect } from 'vitest';
import {
  convertDataSize,
  formatDataValue,
  veriBoyutuMeta,
  DATA_SIZE_ERROR,
  DATA_UNITS,
  type DataSizeResult,
} from './veri-boyutu';

function expectError(result: DataSizeResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

/** Find a row value by its label across all groups. */
function valueByLabel(result: DataSizeResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  for (const group of result.groups) {
    const row = group.rows.find((r) => r.label === label);
    if (row) return row.value;
  }
  throw new Error(`no row labelled "${label}"`);
}

describe('convertDataSize — anchors', () => {
  it('1 MB (SI) → 1000 kB, 1000000 B, 0.001 GB; ~0.9536743 MiB; 8000000 bit (8 Mbit)', () => {
    const r = convertDataSize({ value: '1', fromUnitId: 'MB' });
    expect(r.ok).toBe(true);
    expect(valueByLabel(r, 'Kilobayt (kB)')).toBe('1000');
    expect(valueByLabel(r, 'Bayt (B)')).toBe('1000000');
    expect(valueByLabel(r, 'Gigabayt (GB)')).toBe('0.001');
    expect(valueByLabel(r, 'Mebibayt (MiB)')).toBe('0.9536743');
    expect(valueByLabel(r, 'Bit')).toBe('8000000');
    expect(valueByLabel(r, 'Megabit (Mbit)')).toBe('8');
    if (r.ok) expect(r.bitsTotal).toBe(8e6);
  });

  it('1 MiB (IEC) → 1048576 B, 1.048576 MB, 8388608 bit', () => {
    const r = convertDataSize({ value: '1', fromUnitId: 'MiB' });
    expect(valueByLabel(r, 'Bayt (B)')).toBe('1048576');
    expect(valueByLabel(r, 'Megabayt (MB)')).toBe('1.048576');
    expect(valueByLabel(r, 'Bit')).toBe('8388608');
  });

  it('1 GiB → 1024 MiB, 1073741824 B, ~1.073742 GB', () => {
    const r = convertDataSize({ value: '1', fromUnitId: 'GiB' });
    expect(valueByLabel(r, 'Mebibayt (MiB)')).toBe('1024');
    expect(valueByLabel(r, 'Bayt (B)')).toBe('1073741824');
    expect(valueByLabel(r, 'Gigabayt (GB)')).toBe('1.073742');
  });

  it('8 bit → 1 B', () => {
    const r = convertDataSize({ value: '8', fromUnitId: 'bit' });
    expect(valueByLabel(r, 'Bayt (B)')).toBe('1');
  });

  it('0 → all zero', () => {
    const r = convertDataSize({ value: '0', fromUnitId: 'MB' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const group of r.groups) {
      for (const row of group.rows) expect(row.value).toBe('0');
    }
  });

  it('1.5 GB → 1500 MB, 1500000000 B', () => {
    const r = convertDataSize({ value: '1.5', fromUnitId: 'GB' });
    expect(valueByLabel(r, 'Megabayt (MB)')).toBe('1500');
    expect(valueByLabel(r, 'Bayt (B)')).toBe('1500000000');
  });

  it('accepts a Turkish decimal comma (1,5 GB)', () => {
    const r = convertDataSize({ value: '1,5', fromUnitId: 'GB' });
    expect(valueByLabel(r, 'Megabayt (MB)')).toBe('1500');
  });

  it('accepts a numeric value as well as a string', () => {
    const r = convertDataSize({ value: 2, fromUnitId: 'KiB' });
    expect(valueByLabel(r, 'Bayt (B)')).toBe('2048');
  });

  it('groups are labelled by system', () => {
    const r = convertDataSize({ value: '1', fromUnitId: 'MB' });
    if (!r.ok) throw new Error('expected ok');
    expect(r.groups.map((g) => g.system)).toEqual(['Ondalık (SI)', 'İkilik (IEC)', 'Bit']);
  });
});

describe('convertDataSize — invalid input', () => {
  it('rejects empty input', () => {
    expectError(convertDataSize({ value: '', fromUnitId: 'MB' }), DATA_SIZE_ERROR.INVALID_INPUT);
    expectError(convertDataSize({ value: '   ', fromUnitId: 'MB' }), DATA_SIZE_ERROR.INVALID_INPUT);
  });

  it('rejects a non-numeric value', () => {
    expectError(convertDataSize({ value: 'abc', fromUnitId: 'MB' }), DATA_SIZE_ERROR.INVALID_NUMBER);
    expectError(convertDataSize({ value: '1.2.3', fromUnitId: 'MB' }), DATA_SIZE_ERROR.INVALID_NUMBER);
  });

  it('rejects a negative value', () => {
    expectError(convertDataSize({ value: '-5', fromUnitId: 'MB' }), DATA_SIZE_ERROR.NEGATIVE);
  });

  it('rejects an unknown unit', () => {
    expectError(convertDataSize({ value: '1', fromUnitId: 'XB' }), DATA_SIZE_ERROR.UNKNOWN_UNIT);
  });
});

describe('formatDataValue', () => {
  it('shows integers at full precision (no scientific notation)', () => {
    expect(formatDataValue(1073741824)).toBe('1073741824');
    expect(formatDataValue(1000000)).toBe('1000000');
    expect(formatDataValue(0)).toBe('0');
  });

  it('rounds fractional values to ~7 sig figs and trims zeros', () => {
    expect(formatDataValue(0.001)).toBe('0.001');
    expect(formatDataValue(1.048576)).toBe('1.048576');
    expect(formatDataValue(1.073741824)).toBe('1.073742');
  });
});

describe('DATA_UNITS & metadata', () => {
  it('uses 8 bits per byte and 1024-based IEC factors', () => {
    const byId = (id: string) => DATA_UNITS.find((u) => u.id === id)!;
    expect(byId('B').factorInBits).toBe(8);
    expect(byId('KiB').factorInBits).toBe(8 * 1024);
    expect(byId('MiB').factorInBits).toBe(8 * 1024 * 1024);
    expect(byId('MB').factorInBits).toBe(8e6);
    expect(byId('Mbit').factorInBits).toBe(1e6);
  });

  it('exposes the expected registry metadata (no formula)', () => {
    expect(veriBoyutuMeta.id).toBe('veri-boyutu');
    expect(veriBoyutuMeta.slug).toBe('veri-boyutu-donusturucu');
    expect(veriBoyutuMeta.categoryId).toBe('computer');
    expect(veriBoyutuMeta.formula).toBeUndefined();
    expect(veriBoyutuMeta.faq?.length).toBe(2);
  });
});
