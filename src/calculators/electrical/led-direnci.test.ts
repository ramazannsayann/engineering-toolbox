import { describe, it, expect } from 'vitest';
import {
  solveLedResistor,
  ledResistorMeta,
  LED_RESISTOR_ERROR,
  E24_SERIES,
} from './led-direnci';

type Result = ReturnType<typeof solveLedResistor>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveLedResistor — valid (anchors)', () => {
  it('5 V, V_f 2.0 V, 20 mA → R=150 Ω, P=0.06 W, E24 150 Ω, power 0.125 W', () => {
    const r = solveLedResistor({ supplyVoltageV: 5, ledForwardVoltageV: 2.0, ledCurrentMa: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.resistanceOhms).toBeCloseTo(150, 6);
    expect(r.values.powerW).toBeCloseTo(0.06, 6);
    expect(r.values.e24Ohms).toBe(150);
    expect(r.values.powerRatingW).toBe(0.125);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it('12 V, V_f 3.2 V, 20 mA → R=440 Ω, P=0.176 W, E24 470 Ω, power 0.25 W', () => {
    const r = solveLedResistor({ supplyVoltageV: 12, ledForwardVoltageV: 3.2, ledCurrentMa: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.resistanceOhms).toBeCloseTo(440, 6);
    expect(r.values.powerW).toBeCloseTo(0.176, 6);
    expect(r.values.e24Ohms).toBe(470);
    expect(r.values.powerRatingW).toBe(0.25);
  });

  it('rounds the E24 pick UP (never below the exact resistance)', () => {
    const r = solveLedResistor({ supplyVoltageV: 9, ledForwardVoltageV: 2, ledCurrentMa: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.resistanceOhms).toBeCloseTo(350, 6); // 7 / 0.02
    expect(r.values.e24Ohms).toBe(360); // smallest E24 ≥ 350
  });

  it('returns null power rating when P_R exceeds 2 W', () => {
    const r = solveLedResistor({ supplyVoltageV: 50, ledForwardVoltageV: 2, ledCurrentMa: 100 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.powerW).toBeCloseTo(4.8, 6); // 48 × 0.1
    expect(r.values.powerRatingW).toBeNull();
  });
});

describe('solveLedResistor — invalid input', () => {
  const base = { supplyVoltageV: 5, ledForwardVoltageV: 2, ledCurrentMa: 20 };

  it('rejects supply ≤ forward voltage', () => {
    expectError(solveLedResistor({ ...base, supplyVoltageV: 2 }), LED_RESISTOR_ERROR.SUPPLY_NOT_GREATER);
    expectError(solveLedResistor({ ...base, supplyVoltageV: 1.5 }), LED_RESISTOR_ERROR.SUPPLY_NOT_GREATER);
  });

  it('rejects zero / negative inputs', () => {
    expectError(solveLedResistor({ ...base, ledCurrentMa: 0 }), LED_RESISTOR_ERROR.NON_POSITIVE_VALUE);
    expectError(solveLedResistor({ ...base, ledForwardVoltageV: -2 }), LED_RESISTOR_ERROR.NON_POSITIVE_VALUE);
  });

  it('rejects non-finite inputs', () => {
    expectError(solveLedResistor({ ...base, supplyVoltageV: NaN }), LED_RESISTOR_ERROR.INVALID_NUMBER);
    expectError(solveLedResistor({ ...base, ledCurrentMa: Infinity }), LED_RESISTOR_ERROR.INVALID_NUMBER);
  });

  it('rejects missing values', () => {
    expectError(
      solveLedResistor({ supplyVoltageV: 5, ledForwardVoltageV: 2 }),
      LED_RESISTOR_ERROR.MISSING_VALUE,
    );
  });
});

describe('E24 series', () => {
  it('contains canonical values and is ascending', () => {
    expect(E24_SERIES).toContain(150);
    expect(E24_SERIES).toContain(470);
    expect(E24_SERIES).toContain(360);
    expect(E24_SERIES).toContain(1);
    const sorted = [...E24_SERIES].sort((a, b) => a - b);
    expect(E24_SERIES).toEqual(sorted);
  });
});

describe('ledResistorMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(ledResistorMeta.id).toBe('led-direnci');
    expect(ledResistorMeta.slug).toBe('led-seri-direnci-hesaplayici');
    expect(ledResistorMeta.categoryId).toBe('electrical');
    expect(ledResistorMeta.faq?.length).toBe(2);
  });
});
