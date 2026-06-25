/**
 * Percentage calculator (Yüzde) — pure logic. Three modes (what is Y% of X;
 * X is what percent of Y; percent change X→Y). Negative inputs are allowed
 * (general numbers, not physical magnitudes); per-mode zero-division guards.
 * No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from './linear-convert';

export type YuzdeMode = 'of' | 'isWhatPercent' | 'change';

/** Mode options for the UI (the island relabels its two inputs per mode). */
export const YUZDE_MODES = [
  { id: 'of', label: "X'in %Y'si" },
  { id: 'isWhatPercent', label: "X, Y'nin yüzde kaçı" },
  { id: 'change', label: 'Yüzde değişim (X→Y)' },
] as const satisfies readonly { id: YuzdeMode; label: string }[];

export interface YuzdeInput {
  mode: YuzdeMode;
  a: number;
  b: number;
}

export interface YuzdeSuccess {
  /** The hero numeric result. */
  readonly result: number;
  /** Unit suffix for the hero ('' or '%'). */
  readonly unit: string;
  /** Turkish one-line description of what was computed. */
  readonly resultLabel: string;
  readonly steps: readonly string[];
}

export type YuzdeResult = CalcResult<YuzdeSuccess>;

export const YUZDE_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  INVALID_MODE: 'INVALID_MODE',
} as const;

const fmt = formatNumber;

/**
 * Compute a percentage by mode. Pure and total — returns a failure for
 * non-finite inputs or a per-mode division by zero.
 */
export function convertPercentage(input: YuzdeInput): YuzdeResult {
  const { mode, a, b } = input;

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return fail<YuzdeSuccess>(YUZDE_ERROR.INVALID_NUMBER, 'Geçerli sayılar girin.');
  }

  if (mode === 'of') {
    const result = a * (b / 100);
    return {
      ok: true,
      result,
      unit: '',
      resultLabel: `${fmt(a)} sayısının %${fmt(b)}'si`,
      steps: [`Sonuç: ${fmt(a)} × (${fmt(b)} / 100) = ${fmt(result)}`],
    };
  }

  if (mode === 'isWhatPercent') {
    if (b === 0) {
      return fail<YuzdeSuccess>(YUZDE_ERROR.DIVISION_BY_ZERO, 'Bölen (Y) sıfır olamaz.');
    }
    const result = (a / b) * 100;
    return {
      ok: true,
      result,
      unit: '%',
      resultLabel: `${fmt(a)}, ${fmt(b)} sayısının %${fmt(result)} kadarıdır`,
      steps: [`Sonuç: (${fmt(a)} / ${fmt(b)}) × 100 = ${fmt(result)} %`],
    };
  }

  if (mode === 'change') {
    if (a === 0) {
      return fail<YuzdeSuccess>(YUZDE_ERROR.DIVISION_BY_ZERO, 'İlk değer sıfır olamaz.');
    }
    const result = ((b - a) / a) * 100;
    const direction = result > 0 ? 'artış' : result < 0 ? 'azalış' : 'değişim yok';
    return {
      ok: true,
      result,
      unit: '%',
      resultLabel: `%${fmt(Math.abs(result))} ${direction}`,
      steps: [
        `Sonuç: ((${fmt(b)} − ${fmt(a)}) / ${fmt(a)}) × 100 = ${fmt(result)} %`,
        `Yön: ${direction}`,
      ],
    };
  }

  return fail<YuzdeSuccess>(YUZDE_ERROR.INVALID_MODE, 'Geçersiz mod.');
}

/** Registry metadata for the percentage calculator. */
export const yuzdeMeta: Calculator = {
  id: 'yuzde-hesaplama',
  slug: 'yuzde-hesaplama',
  categoryId: 'general',
  title: 'Yüzde Hesaplama',
  description:
    'Bir sayının yüzdesini, bir sayının diğerinin yüzde kaçı olduğunu veya iki değer arasındaki yüzde değişimini hesaplayın.',
  keywords: [
    'yüzde hesaplama',
    'yüzde hesaplama nasıl yapılır',
    'yüzde kaç',
    'yüzde artış azalış',
    'oran hesaplama',
    'percentage hesaplama',
  ],
  relatedTools: ['kdv-hesaplama', 'agirlik-donusturucu'],
  faq: [
    {
      question: 'Bir sayının yüzdesi nasıl hesaplanır?',
      answer:
        'Bir sayının belirli bir yüzdesini bulmak için sayıyı yüzde değeriyle çarpıp 100’e bölersiniz: Sonuç = Sayı × (Yüzde / 100). Örneğin 200’ün %15’i = 200 × (15 / 100) = 30’dur.',
    },
    {
      question: 'Yüzde artış nasıl hesaplanır?',
      answer:
        'İki değer arasındaki yüzde değişim, ((Son değer − İlk değer) / İlk değer) × 100 ile bulunur. Sonuç pozitifse artış, negatifse azalış vardır. Örneğin 100’den 150’ye geçiş ((150 − 100) / 100) × 100 = %50 artıştır.',
    },
  ],
};
