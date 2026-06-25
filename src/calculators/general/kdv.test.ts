import { describe, it, expect } from 'vitest';
import { convertVat, kdvMeta, KDV_RATES, VAT_ERROR, type VatResult } from './kdv';

function expectError(result: VatResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('convertVat — add (KDV ekle)', () => {
  it('100 @ %20 → kdv 20, gross 120, net 100', () => {
    const r = convertVat({ amount: 100, rate: 20, direction: 'add' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.net).toBeCloseTo(100, 9);
    expect(r.kdv).toBeCloseTo(20, 9);
    expect(r.gross).toBeCloseTo(120, 9);
  });

  it('1000 @ %10 → kdv 100, gross 1100', () => {
    const r = convertVat({ amount: 1000, rate: 10, direction: 'add' });
    expect(r.ok && r.kdv).toBeCloseTo(100, 9);
    expect(r.ok && r.gross).toBeCloseTo(1100, 9);
  });
});

describe('convertVat — extract (KDV ayır)', () => {
  it('120 @ %20 → net 100, kdv 20', () => {
    const r = convertVat({ amount: 120, rate: 20, direction: 'extract' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.net).toBeCloseTo(100, 9);
    expect(r.kdv).toBeCloseTo(20, 9);
    expect(r.gross).toBeCloseTo(120, 9);
  });

  it('110 @ %10 → net 100, kdv 10', () => {
    const r = convertVat({ amount: 110, rate: 10, direction: 'extract' });
    expect(r.ok && r.net).toBeCloseTo(100, 9);
    expect(r.ok && r.kdv).toBeCloseTo(10, 9);
  });

  it('101 @ %1 → net 100, kdv 1', () => {
    const r = convertVat({ amount: 101, rate: 1, direction: 'extract' });
    expect(r.ok && r.net).toBeCloseTo(100, 9);
    expect(r.ok && r.kdv).toBeCloseTo(1, 9);
  });

  it('add then extract is the inverse (extract(add(x)) ≈ x)', () => {
    const added = convertVat({ amount: 250, rate: 20, direction: 'add' });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const extracted = convertVat({ amount: added.gross, rate: 20, direction: 'extract' });
    expect(extracted.ok && extracted.net).toBeCloseTo(250, 9);
  });
});

describe('convertVat — 0 and errors', () => {
  it('0 → all zero', () => {
    const r = convertVat({ amount: 0, rate: 20, direction: 'add' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.net).toBe(0);
    expect(r.kdv).toBe(0);
    expect(r.gross).toBe(0);
  });

  it('rejects negative amount, out-of-range rate, non-finite', () => {
    expectError(convertVat({ amount: -5, rate: 20, direction: 'add' }), VAT_ERROR.NEGATIVE_AMOUNT);
    expectError(convertVat({ amount: 100, rate: 120, direction: 'add' }), VAT_ERROR.RATE_RANGE);
    expectError(convertVat({ amount: 100, rate: -1, direction: 'add' }), VAT_ERROR.RATE_RANGE);
    expectError(convertVat({ amount: NaN, rate: 20, direction: 'add' }), VAT_ERROR.INVALID_NUMBER);
  });
});

describe('kdvMeta & rates', () => {
  it('exposes the current TR preset rates and metadata', () => {
    expect(KDV_RATES.map((r) => r.rate)).toEqual([20, 10, 1]);
    expect(kdvMeta.id).toBe('kdv-hesaplama');
    expect(kdvMeta.categoryId).toBe('general');
    expect(kdvMeta.formula).toBeUndefined();
    expect(kdvMeta.faq?.length).toBe(2);
  });
});
