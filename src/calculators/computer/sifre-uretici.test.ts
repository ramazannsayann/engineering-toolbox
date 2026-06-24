import { describe, it, expect } from 'vitest';
import {
  generatePassword,
  buildCharPool,
  UPPER,
  LOWER,
  DIGITS,
  SYMBOLS,
  PASSWORD_ERROR,
  type RandomInt,
  type PasswordOptions,
} from './sifre-uretici';

/** Deterministic, reproducible randomInt: a counter mod maxExclusive. Always
 *  returns a valid index, so property assertions are stable. */
function counterRandom(start = 0): RandomInt {
  let i = start;
  return (max: number) => {
    const v = i % max;
    i += 1;
    return v;
  };
}

const ALL: PasswordOptions = { length: 16, upper: true, lower: true, digits: true, symbols: true };

function hasFrom(password: string, set: string): boolean {
  return [...password].some((c) => set.includes(c));
}

describe('generatePassword — properties (deterministic injected randomInt)', () => {
  it('produces the requested length for various lengths', () => {
    for (const length of [4, 8, 16, 32, 64, 128]) {
      const r = generatePassword({ ...ALL, length }, counterRandom(length));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.password.length).toBe(length);
    }
  });

  it('only uses characters from the enabled pool', () => {
    const r = generatePassword({ length: 40, upper: true, lower: false, digits: true, symbols: false }, counterRandom());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pool = UPPER + DIGITS;
    expect([...r.password].every((c) => pool.includes(c))).toBe(true);
  });

  it('with all sets enabled, contains ≥1 upper, lower, digit and symbol', () => {
    for (let seed = 0; seed < 20; seed++) {
      const r = generatePassword(ALL, counterRandom(seed));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(hasFrom(r.password, UPPER)).toBe(true);
      expect(hasFrom(r.password, LOWER)).toBe(true);
      expect(hasFrom(r.password, DIGITS)).toBe(true);
      expect(hasFrom(r.password, SYMBOLS)).toBe(true);
    }
  });

  it('with only digits enabled, the output is all digits', () => {
    const r = generatePassword({ length: 24, upper: false, lower: false, digits: true, symbols: false }, counterRandom());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(/^[0-9]+$/.test(r.password)).toBe(true);
    if (r.ok) expect(r.poolSize).toBe(10);
  });

  it('guarantees one-of-each even at the minimum length (4) with 4 sets', () => {
    for (let seed = 0; seed < 30; seed++) {
      const r = generatePassword({ length: 4, upper: true, lower: true, digits: true, symbols: true }, counterRandom(seed));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.password.length).toBe(4);
      // exactly one of each → all four sets present
      expect(hasFrom(r.password, UPPER)).toBe(true);
      expect(hasFrom(r.password, LOWER)).toBe(true);
      expect(hasFrom(r.password, DIGITS)).toBe(true);
      expect(hasFrom(r.password, SYMBOLS)).toBe(true);
    }
  });
});

describe('generatePassword / buildCharPool — validation', () => {
  it('fails when no set is enabled', () => {
    const r = generatePassword({ length: 16, upper: false, lower: false, digits: false, symbols: false }, counterRandom());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(PASSWORD_ERROR.NO_SET);
  });

  it('fails when length is out of [4, 128] or not an integer', () => {
    for (const length of [3, 0, -5, 129, 1000, 8.5, NaN]) {
      const r = generatePassword({ ...ALL, length }, counterRandom());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe(PASSWORD_ERROR.LENGTH_RANGE);
    }
  });

  it('buildCharPool returns the combined pool of enabled sets', () => {
    const r = buildCharPool(ALL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pool).toBe(UPPER + LOWER + DIGITS + SYMBOLS);
    expect(r.sets.length).toBe(4);
  });
});
