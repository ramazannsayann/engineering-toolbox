/**
 * Volumetric flow rate (Debi) calculator — pure logic.
 *
 * Physics: Q = A · v, with circular cross-section A = π·(d/2)². Given an inner
 * diameter (mm) and a flow velocity (m/s), returns the volumetric flow in
 * m³/s and the common practical units (m³/h, L/min, L/s).
 *
 * NOTE: this is the GENERAL flow tool for the Isı & Akış category, kept separate
 * from the HVAC water-specific `su-debisi` tool (same A·v math, different
 * category/keywords). CLEAN-PHYSICS, no constant tables. No React/Astro/DOM.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

/** m³/s → m³/h. */
export const M3S_TO_M3H = 3600;
/** m³/s → L/min. */
export const M3S_TO_LMIN = 60000;
/** m³/s → L/s. */
export const M3S_TO_LS = 1000;

export interface FlowRow {
  readonly label: string;
  readonly value: string;
}

export interface FlowRateInput {
  diameterMm: number;
  velocityMs: number;
}

export interface FlowRateSuccess {
  readonly areaM2: number;
  readonly m3PerSec: number;
  readonly m3PerHour: number;
  readonly lPerMin: number;
  readonly lPerSec: number;
  /** Flow expressed in m³/h, L/min, L/s (copyable rows). */
  readonly rows: readonly FlowRow[];
  readonly steps: readonly string[];
}

export type FlowRateResult = CalcResult<FlowRateSuccess>;

export const FLOW_RATE_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_DIAMETER: 'NON_POSITIVE_DIAMETER',
  NON_POSITIVE_VELOCITY: 'NON_POSITIVE_VELOCITY',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the volumetric flow rate Q = A·v. Pure and total — returns a failure
 * object (never throws) for invalid input.
 */
export function solveFlowRate(input: FlowRateInput): FlowRateResult {
  const { diameterMm, velocityMs } = input;

  if (!Number.isFinite(diameterMm)) {
    return fail<FlowRateSuccess>(FLOW_RATE_ERROR.INVALID_NUMBER, 'Geçerli bir çap girin.');
  }
  if (diameterMm <= 0) {
    return fail<FlowRateSuccess>(FLOW_RATE_ERROR.NON_POSITIVE_DIAMETER, "Çap 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(velocityMs)) {
    return fail<FlowRateSuccess>(FLOW_RATE_ERROR.INVALID_NUMBER, 'Geçerli bir hız girin.');
  }
  if (velocityMs <= 0) {
    return fail<FlowRateSuccess>(FLOW_RATE_ERROR.NON_POSITIVE_VELOCITY, "Hız 0'dan büyük olmalı.");
  }

  const diameterM = diameterMm / 1000;
  const areaM2 = Math.PI * (diameterM / 2) ** 2;
  const m3PerSec = areaM2 * velocityMs;
  const m3PerHour = m3PerSec * M3S_TO_M3H;
  const lPerMin = m3PerSec * M3S_TO_LMIN;
  const lPerSec = m3PerSec * M3S_TO_LS;

  if (![areaM2, m3PerSec, m3PerHour, lPerMin, lPerSec].every(Number.isFinite) || m3PerSec <= 0) {
    return fail<FlowRateSuccess>(
      FLOW_RATE_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const rows: FlowRow[] = [
    { label: 'Debi (m³/saat)', value: fmt(m3PerHour) },
    { label: 'Debi (litre/dakika)', value: fmt(lPerMin) },
    { label: 'Debi (litre/saniye)', value: fmt(lPerSec) },
  ];

  return {
    ok: true,
    areaM2,
    m3PerSec,
    m3PerHour,
    lPerMin,
    lPerSec,
    rows,
    steps: [
      `Çap: d = ${fmt(diameterMm)} mm = ${fmt(diameterM)} m`,
      `Kesit alanı: A = π·(d/2)² = ${fmt(areaM2)} m²`,
      `Debi: Q = A·v = ${fmt(areaM2)} × ${fmt(velocityMs)} = ${fmt(m3PerSec)} m³/s = ${fmt(m3PerHour)} m³/saat`,
    ],
  };
}

/** Registry metadata for the general flow-rate calculator. */
export const debiMeta: Calculator = {
  id: 'debi-hesaplama',
  slug: 'debi-hesaplama',
  categoryId: 'thermal',
  title: 'Debi Hesaplama (Q = A·v)',
  description:
    'Boru/kanal kesit çapı ve akış hızından hacimsel debiyi (m³/saat, L/dakika, L/saniye) hesaplayın.',
  keywords: [
    'debi hesaplama',
    'hacimsel debi',
    'akış debisi hesaplama',
    'Q=A.v debi',
    'boru debisi hesaplama',
    'kanal debisi',
  ],
  relatedTools: ['reynolds-sayisi', 'borudaki-basinc-kaybi', 'su-debisi'],
  faq: [
    {
      question: 'Debi (Q) nasıl hesaplanır?',
      answer:
        'Hacimsel debi Q = A · v formülüyle bulunur: kesit alanı (A) × akış hızı (v). Dairesel bir boruda kesit alanı A = π·(d/2)² olduğundan, çap ve hız bilindiğinde debi doğrudan hesaplanır. SI biriminde sonuç m³/s çıkar; pratikte m³/saat (×3600), L/dakika (×60000) ve L/saniye (×1000) olarak ifade edilir.',
    },
    {
      question: 'Hacimsel debi nedir?',
      answer:
        'Hacimsel debi, birim zamanda bir kesitten geçen akışkan hacmidir; tipik birimleri m³/saat, L/dakika ve L/saniyedir. Aynı debide boru çapı küçüldükçe akış hızı artar (Q sabitken A azalırsa v artar). Pompa, boru çapı ve basınç kaybı seçiminde temel bir büyüklüktür.',
    },
  ],
};
