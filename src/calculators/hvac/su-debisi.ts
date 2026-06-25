/**
 * Water flow rate calculator (Su Debisi) — pure logic. Q = A·v, where A is the
 * pipe's cross-sectional area from its inner diameter. No React/Astro/DOM
 * imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

export interface WaterFlowInput {
  /** Pipe inner diameter in millimeters. */
  diameterMm: number;
  /** Flow velocity in meters per second. */
  velocityMs: number;
}

export interface FlowRow {
  readonly label: string;
  readonly value: string;
}

export interface WaterFlowSuccess {
  readonly rows: readonly FlowRow[];
  /** Cross-sectional area in m². */
  readonly areaM2: number;
  readonly steps: readonly string[];
}

export type WaterFlowResult = CalcResult<WaterFlowSuccess>;

export const WATER_FLOW_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_DIAMETER: 'NON_POSITIVE_DIAMETER',
  NON_POSITIVE_VELOCITY: 'NON_POSITIVE_VELOCITY',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the water flow rate from pipe inner diameter and velocity. Pure and
 * total — returns a failure object (never throws) for invalid input.
 */
export function solveWaterFlow(input: WaterFlowInput): WaterFlowResult {
  const { diameterMm, velocityMs } = input;

  if (!Number.isFinite(diameterMm)) {
    return fail<WaterFlowSuccess>(WATER_FLOW_ERROR.INVALID_NUMBER, 'Geçerli bir çap girin.');
  }
  if (diameterMm <= 0) {
    return fail<WaterFlowSuccess>(WATER_FLOW_ERROR.NON_POSITIVE_DIAMETER, "Çap 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(velocityMs)) {
    return fail<WaterFlowSuccess>(WATER_FLOW_ERROR.INVALID_NUMBER, 'Geçerli bir hız girin.');
  }
  if (velocityMs <= 0) {
    return fail<WaterFlowSuccess>(WATER_FLOW_ERROR.NON_POSITIVE_VELOCITY, "Hız 0'dan büyük olmalı.");
  }

  const d = diameterMm / 1000; // mm → m
  const areaM2 = Math.PI * (d / 2) ** 2;
  const qSi = areaM2 * velocityMs; // m³/s
  const m3h = qSi * 3600;
  const lPerMin = qSi * 60000;
  const lPerSec = qSi * 1000;

  if (![areaM2, m3h, lPerMin, lPerSec].every(Number.isFinite) || qSi <= 0) {
    return fail<WaterFlowSuccess>(
      WATER_FLOW_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  return {
    ok: true,
    areaM2,
    rows: [
      { label: 'Debi (m³/saat)', value: fmt(m3h) },
      { label: 'Debi (L/dakika)', value: fmt(lPerMin) },
      { label: 'Debi (L/saniye)', value: fmt(lPerSec) },
    ],
    steps: [
      `Kesit alanı: A = π × (d/2)² = π × (${fmt(d)}/2)² = ${fmt(areaM2)} m²`,
      `Debi: Q = A × v = ${fmt(areaM2)} × ${fmt(velocityMs)} = ${fmt(qSi)} m³/s`,
      `m³/saat: ${fmt(qSi)} × 3600 = ${fmt(m3h)} m³/saat`,
    ],
  };
}

/** Registry metadata for the water flow calculator. */
export const suDebisiMeta: Calculator = {
  id: 'su-debisi',
  slug: 'su-debisi-hesaplayici',
  categoryId: 'hvac',
  title: 'Su Debisi Hesaplayıcı',
  description:
    'Boru iç çapı ve akış hızından su debisini (m³/saat, L/dakika, L/saniye) hesaplayın.',
  keywords: [
    'su debisi hesaplama',
    'boru debisi',
    'debi hesaplama',
    'akış hızı debi',
    'm3/saat hesaplama',
    'boru su debisi',
  ],
  relatedTools: ['boru-capi', 'pompa-gucu', 'su-isitma-gucu'],
  faq: [
    {
      question: 'Su debisi nasıl hesaplanır?',
      answer:
        'Debi Q = A × v formülüyle bulunur: borunun kesit alanı (A) ile akış hızının (v) çarpımı. Kesit alanı dairesel boru için A = π × (d/2)² ile hesaplanır (d: iç çap). Sonuç m³/s çıkar; 3600 ile çarpılarak m³/saat, 1000 ile çarpılarak L/s elde edilir.',
    },
    {
      question: 'Boru çapı debiyi nasıl etkiler?',
      answer:
        'Kesit alanı çapın karesiyle orantılı olduğundan, aynı akış hızında çapı iki katına çıkarmak debiyi dört katına çıkarır. Bu nedenle küçük bir çap artışı bile taşınabilen debiyi belirgin biçimde artırır.',
    },
  ],
};
