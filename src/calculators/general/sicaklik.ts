/**
 * Temperature converter (Sıcaklık) — pure logic. Unlike the linear converters,
 * temperature needs OFFSETS (not a single factor), so it has its own engine.
 * Everything routes through Celsius. Rejects values below absolute zero (checked
 * in the INPUT's own unit). No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from './linear-convert';

export type TempUnit = 'C' | 'F' | 'K';

/** Unit options for the UI dropdown. */
export const TEMP_UNITS = [
  { id: 'C', label: 'Celsius (°C)' },
  { id: 'F', label: 'Fahrenheit (°F)' },
  { id: 'K', label: 'Kelvin (K)' },
] as const satisfies readonly { id: TempUnit; label: string }[];

export interface TempInput {
  value: number;
  fromUnit: TempUnit;
}

export interface TempRow {
  readonly label: string;
  readonly value: string;
}

export interface TempSuccess {
  readonly rows: readonly TempRow[];
}

export type TempResult = CalcResult<TempSuccess>;

export const TEMP_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  BELOW_ABSOLUTE_ZERO: 'BELOW_ABSOLUTE_ZERO',
  INVALID_UNIT: 'INVALID_UNIT',
} as const;

const LABEL: Record<TempUnit, string> = {
  C: 'Celsius (°C)',
  F: 'Fahrenheit (°F)',
  K: 'Kelvin (K)',
};

/** Absolute zero in each unit (the lowest physically valid value). */
const ABSOLUTE_ZERO: Record<TempUnit, number> = {
  C: -273.15,
  F: -459.67,
  K: 0,
};

const ORDER: readonly TempUnit[] = ['C', 'F', 'K'];

/**
 * Convert a temperature into the other two units. Pure and total — returns a
 * failure for an invalid unit, a non-finite value, or a temperature below
 * absolute zero. Negative temperatures above absolute zero are valid.
 */
export function convertTemperature(input: TempInput): TempResult {
  const { value, fromUnit } = input;

  if (fromUnit !== 'C' && fromUnit !== 'F' && fromUnit !== 'K') {
    return fail<TempSuccess>(TEMP_ERROR.INVALID_UNIT, 'Geçersiz sıcaklık birimi.');
  }
  if (!Number.isFinite(value)) {
    return fail<TempSuccess>(TEMP_ERROR.INVALID_NUMBER, 'Geçerli bir sayı girin.');
  }
  if (value < ABSOLUTE_ZERO[fromUnit]) {
    return fail<TempSuccess>(
      TEMP_ERROR.BELOW_ABSOLUTE_ZERO,
      'Mutlak sıfırın altında sıcaklık olamaz.',
    );
  }

  // Route everything through Celsius.
  let celsius: number;
  if (fromUnit === 'C') celsius = value;
  else if (fromUnit === 'F') celsius = ((value - 32) * 5) / 9;
  else celsius = value - 273.15;

  const all: Record<TempUnit, number> = {
    C: celsius,
    F: (celsius * 9) / 5 + 32,
    K: celsius + 273.15,
  };

  const rows: TempRow[] = ORDER.filter((u) => u !== fromUnit).map((u) => ({
    label: LABEL[u],
    value: formatNumber(all[u]),
  }));

  return { ok: true, rows };
}

/** Registry metadata for the temperature converter. */
export const sicaklikMeta: Calculator = {
  id: 'sicaklik-donusturucu',
  slug: 'sicaklik-donusturucu',
  categoryId: 'general',
  title: 'Sıcaklık Dönüştürücü',
  description:
    'Celsius, Fahrenheit ve Kelvin sıcaklık birimleri arasında dönüşüm yapın.',
  keywords: [
    'sıcaklık dönüştürücü',
    'fahrenheit celsius çevirme',
    'santigrat fahrenheit',
    'celsius kelvin',
    'derece çevirici',
    'fahrenheit kaç derece',
  ],
  relatedTools: ['uzunluk-donusturucu', 'agirlik-donusturucu'],
  faq: [
    {
      question: "Fahrenheit nasıl Celsius'a çevrilir?",
      answer:
        'Fahrenheit’i Celsius’a çevirmek için °C = (°F − 32) × 5/9 formülü kullanılır. Önce 32 çıkarılır, sonra 5/9 (yaklaşık 0,556) ile çarpılır. Örneğin 98,6 °F = (98,6 − 32) × 5/9 = 37 °C’dir.',
    },
    {
      question: "Mutlak sıfır (0 Kelvin) kaç derece Celsius'tur?",
      answer:
        'Mutlak sıfır, teorik olarak ulaşılabilecek en düşük sıcaklıktır ve 0 Kelvin’e eşittir; bu da −273,15 °C (−459,67 °F) demektir. Bu sıcaklığın altında bir değer fiziksel olarak mümkün değildir.',
    },
  ],
};
