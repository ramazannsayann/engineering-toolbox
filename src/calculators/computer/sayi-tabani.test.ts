import { describe, it, expect } from 'vitest';
import {
  convertNumberBase,
  sayiTabaniMeta,
  NUMBER_BASE_ERROR,
  NUMBER_BASES,
  type NumberBase,
  type NumberBaseResult,
} from './sayi-tabani';

function expectError(result: NumberBaseResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

function valueOf(result: NumberBaseResult, base: NumberBase): string {
  if (!result.ok) throw new Error('expected ok result');
  const row = result.rows.find((r) => r.base === base);
  if (!row) throw new Error(`no row for base ${base}`);
  return row.value;
}

describe('convertNumberBase — anchors', () => {
  it('255 (decimal) → bin 11111111, oct 377, hex FF', () => {
    const r = convertNumberBase({ value: '255', fromBase: 10 });
    expect(r.ok).toBe(true);
    expect(valueOf(r, 2)).toBe('11111111');
    expect(valueOf(r, 8)).toBe('377');
    expect(valueOf(r, 10)).toBe('255');
    expect(valueOf(r, 16)).toBe('FF');
    if (r.ok) expect(r.bitLength).toBe(8);
  });

  it('FF (hex) → dec 255, bin 11111111', () => {
    const r = convertNumberBase({ value: 'FF', fromBase: 16 });
    expect(valueOf(r, 10)).toBe('255');
    expect(valueOf(r, 2)).toBe('11111111');
  });

  it('hex is case-insensitive (ff → FF / 255)', () => {
    const r = convertNumberBase({ value: 'ff', fromBase: 16 });
    expect(valueOf(r, 16)).toBe('FF');
    expect(valueOf(r, 10)).toBe('255');
  });

  it('1010 (binary) → dec 10, hex A', () => {
    const r = convertNumberBase({ value: '1010', fromBase: 2 });
    expect(valueOf(r, 10)).toBe('10');
    expect(valueOf(r, 16)).toBe('A');
  });

  it('18446744073709551615 (decimal) → hex FFFFFFFFFFFFFFFF (BigInt, no precision loss)', () => {
    const r = convertNumberBase({ value: '18446744073709551615', fromBase: 10 });
    expect(valueOf(r, 16)).toBe('FFFFFFFFFFFFFFFF');
    expect(valueOf(r, 2)).toBe('1'.repeat(64));
    if (r.ok) expect(r.bitLength).toBe(64);
  });

  it('0 → all bases are "0", bitLength 1', () => {
    const r = convertNumberBase({ value: '0', fromBase: 10 });
    expect(valueOf(r, 2)).toBe('0');
    expect(valueOf(r, 8)).toBe('0');
    expect(valueOf(r, 10)).toBe('0');
    expect(valueOf(r, 16)).toBe('0');
    if (r.ok) expect(r.bitLength).toBe(1);
  });

  it('trims surrounding whitespace and ignores leading zeros', () => {
    const r = convertNumberBase({ value: '  00255  ', fromBase: 10 });
    expect(valueOf(r, 10)).toBe('255');
    expect(valueOf(r, 16)).toBe('FF');
  });
});

describe('convertNumberBase — invalid input', () => {
  it('rejects an empty / whitespace value', () => {
    expectError(convertNumberBase({ value: '', fromBase: 10 }), NUMBER_BASE_ERROR.INVALID_INPUT);
    expectError(convertNumberBase({ value: '   ', fromBase: 10 }), NUMBER_BASE_ERROR.INVALID_INPUT);
  });

  it('rejects an illegal binary digit (2)', () => {
    expectError(convertNumberBase({ value: '2', fromBase: 2 }), NUMBER_BASE_ERROR.INVALID_DIGIT);
  });

  it('rejects an illegal octal digit (8)', () => {
    expectError(convertNumberBase({ value: '8', fromBase: 8 }), NUMBER_BASE_ERROR.INVALID_DIGIT);
  });

  it('rejects an illegal hex digit (G) and an illegal decimal digit (A)', () => {
    expectError(convertNumberBase({ value: 'G', fromBase: 16 }), NUMBER_BASE_ERROR.INVALID_DIGIT);
    expectError(convertNumberBase({ value: 'A', fromBase: 10 }), NUMBER_BASE_ERROR.INVALID_DIGIT);
  });

  it('rejects negatives and fractions', () => {
    expectError(convertNumberBase({ value: '-5', fromBase: 10 }), NUMBER_BASE_ERROR.NEGATIVE_OR_FRACTION);
    expectError(convertNumberBase({ value: '1.5', fromBase: 10 }), NUMBER_BASE_ERROR.NEGATIVE_OR_FRACTION);
    expectError(convertNumberBase({ value: '1,5', fromBase: 10 }), NUMBER_BASE_ERROR.NEGATIVE_OR_FRACTION);
  });

  it('rejects a pathologically long input', () => {
    expectError(
      convertNumberBase({ value: '1'.repeat(10001), fromBase: 10 }),
      NUMBER_BASE_ERROR.TOO_LONG,
    );
  });

  it('rejects an invalid base', () => {
    expectError(
      convertNumberBase({ value: '10', fromBase: 7 as unknown as NumberBase }),
      NUMBER_BASE_ERROR.INVALID_BASE,
    );
  });

  it('gives a base-specific invalid-digit message', () => {
    const r = convertNumberBase({ value: '2', fromBase: 2 });
    if (r.ok) throw new Error('expected failure');
    expect(r.error.message).toContain('İkilik');
  });
});

describe('NUMBER_BASES & metadata', () => {
  it('exposes the four bases in ascending order', () => {
    expect(NUMBER_BASES.map((b) => b.base)).toEqual([2, 8, 10, 16]);
  });

  it('exposes the expected registry metadata (no formula)', () => {
    expect(sayiTabaniMeta.id).toBe('sayi-tabani');
    expect(sayiTabaniMeta.slug).toBe('sayi-tabani-donusturucu');
    expect(sayiTabaniMeta.categoryId).toBe('computer');
    expect(sayiTabaniMeta.formula).toBeUndefined();
    expect(sayiTabaniMeta.faq?.length).toBe(2);
  });
});
