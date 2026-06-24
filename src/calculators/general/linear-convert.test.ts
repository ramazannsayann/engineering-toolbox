import { describe, it, expect } from 'vitest';
import {
  convertLinear,
  formatNumber,
  LINEAR_ERROR,
  type LinearUnit,
  type LinearResult,
} from './linear-convert';

const FIXTURE: readonly LinearUnit[] = [
  { id: 'a', label: 'A', factorToBase: 1 },
  { id: 'b', label: 'B', factorToBase: 2 },
  { id: 'c', label: 'C', factorToBase: 10 },
];

function row(result: LinearResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const found = result.rows.find((r) => r.label === label);
  if (!found) throw new Error(`no row "${label}"`);
  return found.value;
}

describe('convertLinear — generic (3-unit fixture)', () => {
  it('converts to every OTHER unit and excludes the source unit', () => {
    const r = convertLinear(10, 'a', FIXTURE); // base = 10
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rows.map((x) => x.label)).toEqual(['B', 'C']); // 'A' excluded
    expect(row(r, 'B')).toBe('5'); // 10 / 2
    expect(row(r, 'C')).toBe('1'); // 10 / 10
  });

  it('handles a non-base source unit', () => {
    const r = convertLinear(3, 'c', FIXTURE); // base = 30
    expect(row(r, 'A')).toBe('30'); // 30 / 1
    expect(row(r, 'B')).toBe('15'); // 30 / 2
  });

  it('0 → all rows "0"', () => {
    const r = convertLinear(0, 'a', FIXTURE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const x of r.rows) expect(x.value).toBe('0');
  });

  it('rejects negative, non-finite, and unknown units', () => {
    const neg = convertLinear(-5, 'a', FIXTURE);
    expect(neg.ok).toBe(false);
    if (!neg.ok) expect(neg.error.code).toBe(LINEAR_ERROR.NEGATIVE);

    const nan = convertLinear(NaN, 'a', FIXTURE);
    expect(nan.ok).toBe(false);
    if (!nan.ok) expect(nan.error.code).toBe(LINEAR_ERROR.INVALID_NUMBER);

    const inf = convertLinear(Infinity, 'a', FIXTURE);
    expect(inf.ok).toBe(false);
    if (!inf.ok) expect(inf.error.code).toBe(LINEAR_ERROR.INVALID_NUMBER);

    const unk = convertLinear(1, 'zzz', FIXTURE);
    expect(unk.ok).toBe(false);
    if (!unk.ok) expect(unk.error.code).toBe(LINEAR_ERROR.UNKNOWN_UNIT);
  });
});

describe('formatNumber', () => {
  it('integers at full precision; 0', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(1000)).toBe('1000');
  });

  it('~6 significant figures, trailing zeros trimmed, no scientific notation', () => {
    expect(formatNumber(39.370078740157474)).toBe('39.3701');
    expect(formatNumber(3.280839895013123)).toBe('3.28084');
    expect(formatNumber(2.54)).toBe('2.54');
    expect(formatNumber(0.001)).toBe('0.001');
  });

  it('keeps small values readable without an exponent', () => {
    expect(formatNumber(0.000621371192237334)).toBe('0.000621371');
    expect(formatNumber(0.0254)).toBe('0.0254');
  });
});
