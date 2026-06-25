import { describe, it, expect } from 'vitest';
import { convertTemperature, sicaklikMeta, TEMP_ERROR, type TempResult } from './sicaklik';

function row(result: TempResult, label: string): string {
  if (!result.ok) throw new Error('expected ok result');
  const found = result.rows.find((r) => r.label === label);
  if (!found) throw new Error(`no row "${label}"`);
  return found.value;
}

function expectError(result: TempResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('convertTemperature — anchors', () => {
  it('100°C → 212°F, 373.15 K (source °C excluded)', () => {
    const r = convertTemperature({ value: 100, fromUnit: 'C' });
    expect(row(r, 'Fahrenheit (°F)')).toBe('212');
    expect(row(r, 'Kelvin (K)')).toBe('373.15');
    expect(r.ok && r.rows.some((x) => x.label === 'Celsius (°C)')).toBe(false);
  });

  it('0°C → 32°F, 273.15 K', () => {
    const r = convertTemperature({ value: 0, fromUnit: 'C' });
    expect(row(r, 'Fahrenheit (°F)')).toBe('32');
    expect(row(r, 'Kelvin (K)')).toBe('273.15');
  });

  it('−40°C → −40°F (the crossover), 233.15 K', () => {
    const r = convertTemperature({ value: -40, fromUnit: 'C' });
    expect(row(r, 'Fahrenheit (°F)')).toBe('-40');
    expect(row(r, 'Kelvin (K)')).toBe('233.15');
  });

  it('32°F → 0°C, 273.15 K', () => {
    const r = convertTemperature({ value: 32, fromUnit: 'F' });
    expect(row(r, 'Celsius (°C)')).toBe('0');
    expect(row(r, 'Kelvin (K)')).toBe('273.15');
  });

  it('98.6°F → 37°C', () => {
    expect(row(convertTemperature({ value: 98.6, fromUnit: 'F' }), 'Celsius (°C)')).toBe('37');
  });

  it('0 K → −273.15°C, −459.67°F', () => {
    const r = convertTemperature({ value: 0, fromUnit: 'K' });
    expect(row(r, 'Celsius (°C)')).toBe('-273.15');
    expect(row(r, 'Fahrenheit (°F)')).toBe('-459.67');
  });

  it('300 K → 26.85°C', () => {
    expect(row(convertTemperature({ value: 300, fromUnit: 'K' }), 'Celsius (°C)')).toBe('26.85');
  });
});

describe('convertTemperature — invalid / below absolute zero', () => {
  it('rejects values below absolute zero in each unit', () => {
    expectError(convertTemperature({ value: -300, fromUnit: 'C' }), TEMP_ERROR.BELOW_ABSOLUTE_ZERO);
    expectError(convertTemperature({ value: -500, fromUnit: 'F' }), TEMP_ERROR.BELOW_ABSOLUTE_ZERO);
    expectError(convertTemperature({ value: -1, fromUnit: 'K' }), TEMP_ERROR.BELOW_ABSOLUTE_ZERO);
  });

  it('allows exactly absolute zero', () => {
    expect(convertTemperature({ value: -273.15, fromUnit: 'C' }).ok).toBe(true);
    expect(convertTemperature({ value: 0, fromUnit: 'K' }).ok).toBe(true);
  });

  it('allows negative temperatures above absolute zero', () => {
    expect(convertTemperature({ value: -10, fromUnit: 'C' }).ok).toBe(true);
  });

  it('rejects non-finite values', () => {
    expectError(convertTemperature({ value: NaN, fromUnit: 'C' }), TEMP_ERROR.INVALID_NUMBER);
    expectError(convertTemperature({ value: Infinity, fromUnit: 'C' }), TEMP_ERROR.INVALID_NUMBER);
  });
});

describe('sicaklikMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(sicaklikMeta.id).toBe('sicaklik-donusturucu');
    expect(sicaklikMeta.categoryId).toBe('general');
    expect(sicaklikMeta.formula).toBeUndefined();
    expect(sicaklikMeta.faq?.length).toBe(2);
  });
});
