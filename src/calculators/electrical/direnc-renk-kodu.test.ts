import { describe, it, expect } from 'vitest';
import {
  decodeResistor,
  resistorColorMeta,
  RESISTOR_ERROR,
  bandLayout,
  bandLabels,
  validColorsFor,
  formatResistance,
  DIGIT_VALUE,
  MULTIPLIER_EXP,
  TOLERANCE_PERCENT,
} from './direnc-renk-kodu';

type Result = ReturnType<typeof decodeResistor>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('decodeResistor — 4-band (anchors)', () => {
  it('yellow,violet,red,gold → 4.7 kΩ ±5%, range 4465–4935', () => {
    const r = decodeResistor(4, ['yellow', 'violet', 'red', 'gold']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resistanceOhms).toBeCloseTo(4700, 6);
    expect(r.tolerancePercent).toBe(5);
    expect(r.displayValue).toBe('4.7 kΩ');
    expect(r.minOhms).toBeCloseTo(4465, 6);
    expect(r.maxOhms).toBeCloseTo(4935, 6);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it('brown,black,orange,gold → 10 kΩ ±5%', () => {
    const r = decodeResistor(4, ['brown', 'black', 'orange', 'gold']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resistanceOhms).toBeCloseTo(10000, 6);
    expect(r.tolerancePercent).toBe(5);
    expect(r.displayValue).toBe('10 kΩ');
  });

  it('gold/silver multiplier produce sub-ohm and tenths values', () => {
    const r = decodeResistor(4, ['brown', 'black', 'gold', 'gold']); // 10 × 0.1
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resistanceOhms).toBeCloseTo(1, 6);
    expect(r.displayValue).toBe('1 Ω');

    const r2 = decodeResistor(4, ['brown', 'black', 'silver', 'gold']); // 10 × 0.01
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.resistanceOhms).toBeCloseTo(0.1, 6);
    expect(r2.displayValue).toBe('100 mΩ');
  });
});

describe('decodeResistor — 5-band (anchors)', () => {
  it('brown,black,black,red,brown → 10 kΩ ±1%', () => {
    const r = decodeResistor(5, ['brown', 'black', 'black', 'red', 'brown']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resistanceOhms).toBeCloseTo(10000, 6);
    expect(r.tolerancePercent).toBe(1);
    expect(r.displayValue).toBe('10 kΩ');
  });

  it('red,red,black,brown,brown → 2.2 kΩ ±1%', () => {
    const r = decodeResistor(5, ['red', 'red', 'black', 'brown', 'brown']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resistanceOhms).toBeCloseTo(2200, 6);
    expect(r.tolerancePercent).toBe(1);
    expect(r.displayValue).toBe('2.2 kΩ');
  });

  it('green,blue,black,red,green → 56 kΩ ±0.5%', () => {
    const r = decodeResistor(5, ['green', 'blue', 'black', 'red', 'green']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resistanceOhms).toBeCloseTo(56000, 6);
    expect(r.tolerancePercent).toBe(0.5);
  });
});

describe('decodeResistor — invalid input', () => {
  it('rejects gold in a digit position', () => {
    expectError(decodeResistor(4, ['gold', 'violet', 'red', 'gold']), RESISTOR_ERROR.INVALID_COLOR);
  });

  it('rejects silver in a digit position (5-band)', () => {
    expectError(
      decodeResistor(5, ['brown', 'silver', 'black', 'red', 'brown']),
      RESISTOR_ERROR.INVALID_COLOR,
    );
  });

  it('rejects an invalid tolerance colour (orange is not a tolerance)', () => {
    expectError(decodeResistor(4, ['yellow', 'violet', 'red', 'orange']), RESISTOR_ERROR.INVALID_COLOR);
  });

  it('rejects a band-count / mode mismatch', () => {
    expectError(decodeResistor(5, ['yellow', 'violet', 'red', 'gold']), RESISTOR_ERROR.BAND_COUNT_MISMATCH);
    expectError(
      decodeResistor(4, ['brown', 'black', 'black', 'red', 'brown']),
      RESISTOR_ERROR.BAND_COUNT_MISMATCH,
    );
  });
});

describe('colour tables & layout helpers', () => {
  it('digit values follow black=0 … white=9', () => {
    expect(DIGIT_VALUE.black).toBe(0);
    expect(DIGIT_VALUE.white).toBe(9);
    expect(DIGIT_VALUE.yellow).toBe(4);
  });

  it('multiplier supports gold (−1) and silver (−2)', () => {
    expect(MULTIPLIER_EXP.gold).toBe(-1);
    expect(MULTIPLIER_EXP.silver).toBe(-2);
    expect(MULTIPLIER_EXP.red).toBe(2);
  });

  it('tolerance table matches the standard ±percentages', () => {
    expect(TOLERANCE_PERCENT.gold).toBe(5);
    expect(TOLERANCE_PERCENT.silver).toBe(10);
    expect(TOLERANCE_PERCENT.brown).toBe(1);
    expect(TOLERANCE_PERCENT.grey).toBe(0.05);
  });

  it('digit bands exclude gold/silver; multiplier includes them', () => {
    expect(validColorsFor('digit')).not.toContain('gold');
    expect(validColorsFor('digit')).not.toContain('silver');
    expect(validColorsFor('multiplier')).toContain('gold');
    expect(validColorsFor('multiplier')).toContain('silver');
  });

  it('band layout/labels match the mode', () => {
    expect(bandLayout(4)).toEqual(['digit', 'digit', 'multiplier', 'tolerance']);
    expect(bandLayout(5)).toEqual(['digit', 'digit', 'digit', 'multiplier', 'tolerance']);
    expect(bandLabels(4)).toEqual(['1. Rakam', '2. Rakam', 'Çarpan', 'Tolerans']);
    expect(bandLabels(5)).toEqual(['1. Rakam', '2. Rakam', '3. Rakam', 'Çarpan', 'Tolerans']);
  });

  it('formats resistance with scaled units', () => {
    expect(formatResistance(470)).toBe('470 Ω');
    expect(formatResistance(4700)).toBe('4.7 kΩ');
    expect(formatResistance(1_500_000)).toBe('1.5 MΩ');
    expect(formatResistance(0.1)).toBe('100 mΩ');
  });
});

describe('resistorColorMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(resistorColorMeta.id).toBe('direnc-renk-kodu');
    expect(resistorColorMeta.slug).toBe('direnc-renk-kodu-hesaplayici');
    expect(resistorColorMeta.categoryId).toBe('electrical');
    expect(resistorColorMeta.faq?.length).toBe(2);
  });
});
