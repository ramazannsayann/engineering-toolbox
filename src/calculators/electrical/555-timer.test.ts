import { describe, it, expect } from 'vitest';
import {
  solveTimer,
  timerMeta,
  TIMER_ERROR,
  formatFrequency,
} from './555-timer';

type Result = ReturnType<typeof solveTimer>;

function expectError(result: Result, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message.length).toBeGreaterThan(0);
}

describe('solveTimer — valid (anchors)', () => {
  it('R1=1kΩ, R2=10kΩ, C=100nF → f≈685.7 Hz, duty≈52.38%, t_high≈0.762 ms, t_low≈0.693 ms', () => {
    const r = solveTimer({ r1KOhm: 1, r2KOhm: 10, capacitance: 100, capacitanceUnit: 'nF' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.frequencyHz).toBeCloseTo(685.714, 2);
    expect(r.values.dutyPercent).toBeCloseTo(52.381, 2);
    expect(r.values.highTimeS * 1000).toBeCloseTo(0.7623, 3);
    expect(r.values.lowTimeS * 1000).toBeCloseTo(0.693, 3);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it('R1=10kΩ, R2=10kΩ, C=10nF → f≈4800 Hz (4.8 kHz), duty≈66.67%', () => {
    const r = solveTimer({ r1KOhm: 10, r2KOhm: 10, capacitance: 10, capacitanceUnit: 'nF' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.frequencyHz).toBeCloseTo(4800, 2);
    expect(r.values.dutyPercent).toBeCloseTo(66.667, 2);
    expect(formatFrequency(r.values.frequencyHz)).toBe('4.8 kHz');
  });

  it('µF unit converts correctly (R1=1kΩ, R2=1kΩ, C=1µF)', () => {
    const r = solveTimer({ r1KOhm: 1, r2KOhm: 1, capacitance: 1, capacitanceUnit: 'µF' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // f = 1.44 / ((1000 + 2000) × 1e-6) = 1.44 / 3e-3 = 480 Hz
    expect(r.values.frequencyHz).toBeCloseTo(480, 2);
    expect(r.values.dutyPercent).toBeCloseTo(66.667, 2);
  });

  it('duty cycle stays strictly between 50% and 100%', () => {
    const r = solveTimer({ r1KOhm: 100, r2KOhm: 1, capacitance: 10, capacitanceUnit: 'nF' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.dutyPercent).toBeGreaterThan(50);
    expect(r.values.dutyPercent).toBeLessThan(100);
  });
});

describe('solveTimer — invalid input', () => {
  const base = { r1KOhm: 1, r2KOhm: 10, capacitance: 100, capacitanceUnit: 'nF' as const };

  it('rejects zero / negative R1, R2 or C', () => {
    expectError(solveTimer({ ...base, r1KOhm: 0 }), TIMER_ERROR.NON_POSITIVE_VALUE);
    expectError(solveTimer({ ...base, r2KOhm: -10 }), TIMER_ERROR.NON_POSITIVE_VALUE);
    expectError(solveTimer({ ...base, capacitance: 0 }), TIMER_ERROR.NON_POSITIVE_VALUE);
  });

  it('rejects non-finite values', () => {
    expectError(solveTimer({ ...base, r1KOhm: NaN }), TIMER_ERROR.INVALID_NUMBER);
    expectError(solveTimer({ ...base, capacitance: Infinity }), TIMER_ERROR.INVALID_NUMBER);
  });

  it('rejects a missing value', () => {
    expectError(
      solveTimer({ r1KOhm: 1, r2KOhm: 10, capacitanceUnit: 'nF' }),
      TIMER_ERROR.MISSING_VALUE,
    );
  });

  it('rejects an invalid capacitance unit', () => {
    // @ts-expect-error — deliberately passing an invalid unit
    expectError(solveTimer({ ...base, capacitanceUnit: 'pF' }), TIMER_ERROR.INVALID_UNIT);
  });
});

describe('timerMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(timerMeta.id).toBe('555-timer');
    expect(timerMeta.slug).toBe('555-timer-frekans-hesaplayici');
    expect(timerMeta.categoryId).toBe('electrical');
    expect(timerMeta.faq?.length).toBe(2);
  });
});
