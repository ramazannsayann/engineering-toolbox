import { describe, it, expect } from 'vitest';
import { solveOhmsLaw, ohmsLawMeta, OHMS_LAW_ERROR } from './ohms-law';

// The four quantities below are mutually consistent (12 = 0.25 × 48, P = 3),
// so EVERY valid input pair must resolve to exactly this same full set.
const EXPECTED = { voltage: 12, current: 0.25, resistance: 48, power: 3 };

function expectAllValues(result: ReturnType<typeof solveOhmsLaw>): void {
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.values.voltage).toBeCloseTo(EXPECTED.voltage);
  expect(result.values.current).toBeCloseTo(EXPECTED.current);
  expect(result.values.resistance).toBeCloseTo(EXPECTED.resistance);
  expect(result.values.power).toBeCloseTo(EXPECTED.power);
}

describe('solveOhmsLaw — valid pairs', () => {
  it('solves from voltage + current', () => {
    expectAllValues(solveOhmsLaw({ voltage: 12, current: 0.25 }));
  });

  it('solves from voltage + resistance', () => {
    expectAllValues(solveOhmsLaw({ voltage: 12, resistance: 48 }));
  });

  it('solves from voltage + power', () => {
    expectAllValues(solveOhmsLaw({ voltage: 12, power: 3 }));
  });

  it('solves from current + resistance', () => {
    expectAllValues(solveOhmsLaw({ current: 0.25, resistance: 48 }));
  });

  it('solves from current + power', () => {
    expectAllValues(solveOhmsLaw({ current: 0.25, power: 3 }));
  });

  it('solves from resistance + power', () => {
    expectAllValues(solveOhmsLaw({ resistance: 48, power: 3 }));
  });

  it('includes non-empty derivation steps on success', () => {
    const result = solveOhmsLaw({ voltage: 12, current: 0.25 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('solveOhmsLaw — invalid input', () => {
  function expectError(
    result: ReturnType<typeof solveOhmsLaw>,
    code: string,
  ): void {
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe(code);
    expect(typeof result.error.message).toBe('string');
    expect(result.error.message.length).toBeGreaterThan(0);
  }

  it('rejects when zero values are provided', () => {
    expectError(solveOhmsLaw({}), OHMS_LAW_ERROR.INSUFFICIENT_VALUES);
  });

  it('rejects when only one value is provided', () => {
    expectError(solveOhmsLaw({ voltage: 12 }), OHMS_LAW_ERROR.INSUFFICIENT_VALUES);
  });

  it('rejects when three values are provided', () => {
    expectError(
      solveOhmsLaw({ voltage: 12, current: 0.25, resistance: 48 }),
      OHMS_LAW_ERROR.TOO_MANY_VALUES,
    );
  });

  it('rejects when four values are provided', () => {
    expectError(
      solveOhmsLaw({ voltage: 12, current: 0.25, resistance: 48, power: 3 }),
      OHMS_LAW_ERROR.TOO_MANY_VALUES,
    );
  });

  it('rejects a negative value', () => {
    expectError(
      solveOhmsLaw({ voltage: -12, current: 0.25 }),
      OHMS_LAW_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects a zero value', () => {
    expectError(
      solveOhmsLaw({ voltage: 0, current: 0.25 }),
      OHMS_LAW_ERROR.NON_POSITIVE_VALUE,
    );
  });

  it('rejects NaN', () => {
    expectError(
      solveOhmsLaw({ voltage: NaN, current: 0.25 }),
      OHMS_LAW_ERROR.INVALID_NUMBER,
    );
  });

  it('rejects Infinity', () => {
    expectError(
      solveOhmsLaw({ voltage: Infinity, current: 0.25 }),
      OHMS_LAW_ERROR.INVALID_NUMBER,
    );
  });

  it('rejects when a computed value overflows to Infinity', () => {
    // power = 1e200 × 1e200 = Infinity — must fail, not return ok with Infinity.
    expectError(
      solveOhmsLaw({ voltage: 1e200, current: 1e200 }),
      OHMS_LAW_ERROR.RESULT_OUT_OF_RANGE,
    );
  });

  it('rejects when a computed value underflows to zero', () => {
    // resistance = MIN_VALUE / 1e300 underflows to 0 — must fail, not silently 0.
    expectError(
      solveOhmsLaw({ voltage: Number.MIN_VALUE, current: 1e300 }),
      OHMS_LAW_ERROR.RESULT_OUT_OF_RANGE,
    );
  });
});

describe('ohmsLawMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(ohmsLawMeta.id).toBe('ohms-law');
    expect(ohmsLawMeta.slug).toBe('ohm-yasasi-hesaplayici');
    expect(ohmsLawMeta.categoryId).toBe('electrical');
    expect(ohmsLawMeta.keywords.length).toBeGreaterThan(0);
  });
});
