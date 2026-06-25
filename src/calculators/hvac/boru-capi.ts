/**
 * Pipe diameter calculator (Boru Çapı) — pure logic. From a target flow and
 * velocity, A = Q/v and the required inner diameter d = √(4A/π); then recommend
 * the nearest standard nominal size (DN) ≥ d. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

/**
 * Common nominal pipe sizes (DN, in mm). DN is a NOMINAL designation — the
 * actual inner diameter varies by pipe material/schedule.
 */
export const STANDARD_DN_MM = [
  15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
] as const;

export interface PipeDiameterInput {
  /** Flow rate in m³/hour. */
  flowM3h: number;
  /** Target flow velocity in m/s. */
  velocityMs: number;
}

export interface PipeDiameterSuccess {
  /** Required inner diameter in mm. */
  readonly requiredDiameterMm: number;
  /** Nearest standard nominal size ≥ required, or null if it exceeds DN300. */
  readonly recommendedDN: number | null;
  /** Cross-sectional area in m². */
  readonly areaM2: number;
  readonly steps: readonly string[];
  /** Optional Turkish note (e.g. when the diameter exceeds the DN range). */
  readonly note?: string;
}

export type PipeDiameterResult = CalcResult<PipeDiameterSuccess>;

export const PIPE_DIAMETER_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_FLOW: 'NON_POSITIVE_FLOW',
  NON_POSITIVE_VELOCITY: 'NON_POSITIVE_VELOCITY',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the required pipe inner diameter and recommended DN. Pure and total —
 * returns a failure object (never throws) for invalid input.
 */
export function solvePipeDiameter(input: PipeDiameterInput): PipeDiameterResult {
  const { flowM3h, velocityMs } = input;

  if (!Number.isFinite(flowM3h)) {
    return fail<PipeDiameterSuccess>(PIPE_DIAMETER_ERROR.INVALID_NUMBER, 'Geçerli bir debi girin.');
  }
  if (flowM3h <= 0) {
    return fail<PipeDiameterSuccess>(PIPE_DIAMETER_ERROR.NON_POSITIVE_FLOW, "Debi 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(velocityMs)) {
    return fail<PipeDiameterSuccess>(PIPE_DIAMETER_ERROR.INVALID_NUMBER, 'Geçerli bir hız girin.');
  }
  if (velocityMs <= 0) {
    return fail<PipeDiameterSuccess>(PIPE_DIAMETER_ERROR.NON_POSITIVE_VELOCITY, "Hız 0'dan büyük olmalı.");
  }

  const qSi = flowM3h / 3600; // m³/s
  const areaM2 = qSi / velocityMs;
  const dM = Math.sqrt((4 * areaM2) / Math.PI);
  const requiredDiameterMm = dM * 1000;

  if (![areaM2, requiredDiameterMm].every(Number.isFinite) || requiredDiameterMm <= 0) {
    return fail<PipeDiameterSuccess>(
      PIPE_DIAMETER_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  // Pick the smallest standard DN ≥ the required diameter. A tiny relative
  // tolerance (1e-5) absorbs floating-point/rounding artifacts so a value that is
  // essentially a standard size (e.g. 50.00006 mm) picks it rather than the next
  // size up — DN is a nominal designation anyway.
  const recommendedDN =
    STANDARD_DN_MM.find((dn) => requiredDiameterMm <= dn * (1 + 1e-5)) ?? null;
  const note =
    recommendedDN === null
      ? 'Hesaplanan çap, kapsanan en büyük nominal çapı (DN300) aşıyor; daha büyük bir özel çap gerekir.'
      : undefined;

  const dnStep =
    recommendedDN !== null
      ? `Önerilen nominal çap: ${requiredDiameterMm <= recommendedDN ? '≥' : ''} DN${recommendedDN}`
      : 'Önerilen nominal çap: DN300 üzeri (özel çap gerekir)';

  return {
    ok: true,
    requiredDiameterMm,
    recommendedDN,
    areaM2,
    ...(note ? { note } : {}),
    steps: [
      `Kesit alanı: A = Q / v = ${fmt(qSi)} / ${fmt(velocityMs)} = ${fmt(areaM2)} m²`,
      `Gereken çap: d = √(4A/π) = √(4 × ${fmt(areaM2)} / π) = ${fmt(requiredDiameterMm)} mm`,
      dnStep,
    ],
  };
}

/** Registry metadata for the pipe diameter calculator. */
export const boruCapiMeta: Calculator = {
  id: 'boru-capi',
  slug: 'boru-capi-hesaplayici',
  categoryId: 'hvac',
  title: 'Boru Çapı Hesaplayıcı',
  description:
    'Debi ve hedef akış hızından gereken boru iç çapını ve önerilen nominal çapı (DN) hesaplayın.',
  keywords: [
    'boru çapı hesaplama',
    'boru çapı seçimi',
    'DN hesaplama',
    'tesisat boru çapı',
    'debi boru çapı',
    'su borusu çapı',
  ],
  relatedTools: ['su-debisi', 'pompa-gucu'],
  faq: [
    {
      question: 'Boru çapı neye göre seçilir?',
      answer:
        'Boru çapı, taşınacak debi ve kabul edilebilir akış hızına göre seçilir. Önce gereken kesit alanı A = Q / v ile bulunur, sonra çap d = √(4A/π) ile hesaplanır ve bu değerden büyük ilk standart nominal çap (DN) seçilir. Çok küçük çap yüksek hız ve basınç kaybına, çok büyük çap gereksiz maliyete yol açar.',
    },
    {
      question: 'Tesisatta önerilen su akış hızı nedir?',
      answer:
        'Tesisat su borularında akış hızı genellikle 1–2 m/s aralığında tutulur. Daha yüksek hızlar gürültü, titreşim ve basınç kaybını artırır; çok düşük hızlar ise büyük (pahalı) borular gerektirir. Bu bir genel kılavuzdur; uygulamaya göre değişebilir.',
    },
  ],
};
