/**
 * Pipe friction pressure loss (Borudaki Basınç Kaybı) — pure logic.
 *
 * Physics (Darcy-Weisbach): ΔP = f · (L/D) · (ρ·v²/2). The Darcy friction
 * factor f comes from the flow regime:
 *   - laminar (Re < 2300): f = 64 / Re,
 *   - else: the Swamee-Jain explicit approximation of the Colebrook equation
 *     f = 0.25 / [log10( ε/(3.7·D) + 5.74/Re^0.9 )]².
 * Head loss h_f = ΔP / (ρ·g).
 *
 * REUSES the Reynolds engine: FLUIDS table + the pure `computeReynolds`/`regimeOf`
 * helpers (no duplicated Re math). CLEAN-PHYSICS; pipe roughness ε is a standard
 * named const table. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';
import { FLUIDS, computeReynolds, regimeOf, LAMINAR_MAX, TURBULENT_MIN } from './reynolds';

/** Gravitational acceleration, m/s². */
export const GRAVITY = 9.81;

export interface PipeMaterial {
  readonly id: string;
  readonly label: string;
  /** Absolute roughness ε in metres. */
  readonly eps: number;
}

/**
 * Absolute pipe roughness ε (m) by material — standard textbook values.
 * Auditable named const table.
 */
export const PIPE_ROUGHNESS: readonly PipeMaterial[] = [
  { id: 'cekme', label: 'Çekme borusu (cam/plastik)', eps: 0.0000015 }, // 0.0015 mm
  { id: 'celik', label: 'Çelik (ticari)', eps: 0.000045 }, // 0.045 mm
  { id: 'galvaniz', label: 'Galvanizli çelik', eps: 0.00015 }, // 0.15 mm
  { id: 'dokme', label: 'Dökme demir', eps: 0.00026 }, // 0.26 mm
  { id: 'beton', label: 'Beton', eps: 0.0003 }, // ~0.3 mm
  { id: 'pvc', label: 'PVC', eps: 0.0000015 }, // 0.0015 mm
];

export interface PressureLossRow {
  readonly label: string;
  readonly value: string;
}

export interface PressureLossInput {
  fluidId: string;
  customRho?: number;
  customMu?: number;
  diameterMm: number;
  velocityMs: number;
  lengthM: number;
  pipeId: string;
}

export interface PressureLossSuccess {
  readonly pressureDropPa: number;
  readonly pressureDropKPa: number;
  readonly pressureDropBar: number;
  readonly headLossM: number;
  readonly reynolds: number;
  readonly regime: string;
  readonly frictionFactor: number;
  readonly rows: readonly PressureLossRow[];
  readonly steps: readonly string[];
  readonly note?: string;
}

export type PressureLossResult = CalcResult<PressureLossSuccess>;

export const PRESSURE_LOSS_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_DIAMETER: 'NON_POSITIVE_DIAMETER',
  NON_POSITIVE_VELOCITY: 'NON_POSITIVE_VELOCITY',
  NON_POSITIVE_LENGTH: 'NON_POSITIVE_LENGTH',
  UNKNOWN_FLUID: 'UNKNOWN_FLUID',
  INVALID_CUSTOM_RHO: 'INVALID_CUSTOM_RHO',
  INVALID_CUSTOM_MU: 'INVALID_CUSTOM_MU',
  UNKNOWN_PIPE: 'UNKNOWN_PIPE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Darcy friction factor: laminar 64/Re below Re=2300, otherwise the Swamee-Jain
 * explicit approximation of Colebrook. Pure; exported for direct testing.
 */
export function frictionFactor(re: number, epsilon: number, diameterM: number): number {
  if (re < LAMINAR_MAX) {
    return 64 / re;
  }
  const term = epsilon / (3.7 * diameterM) + 5.74 / Math.pow(re, 0.9);
  const denom = Math.log10(term);
  return 0.25 / (denom * denom);
}

/**
 * Compute the Darcy-Weisbach pressure loss and head loss in a pipe. Pure and
 * total — returns a failure object (never throws) for invalid input.
 */
export function solvePressureLoss(input: PressureLossInput): PressureLossResult {
  const { fluidId, customRho, customMu, diameterMm, velocityMs, lengthM, pipeId } = input;

  if (!Number.isFinite(diameterMm)) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.INVALID_NUMBER, 'Geçerli bir çap girin.');
  }
  if (diameterMm <= 0) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.NON_POSITIVE_DIAMETER, "Çap 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(velocityMs)) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.INVALID_NUMBER, 'Geçerli bir hız girin.');
  }
  if (velocityMs <= 0) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.NON_POSITIVE_VELOCITY, "Hız 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(lengthM)) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.INVALID_NUMBER, 'Geçerli bir uzunluk girin.');
  }
  if (lengthM <= 0) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.NON_POSITIVE_LENGTH, "Uzunluk 0'dan büyük olmalı.");
  }

  const fluid = FLUIDS.find((f) => f.id === fluidId);
  if (!fluid) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.UNKNOWN_FLUID, 'Geçersiz akışkan seçimi.');
  }
  let rhoUsed: number;
  let muUsed: number;
  if (fluid.rho === null || fluid.mu === null) {
    if (customRho === undefined || !Number.isFinite(customRho) || customRho <= 0) {
      return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.INVALID_CUSTOM_RHO, "Özel yoğunluk (ρ) değeri girin (0'dan büyük).");
    }
    if (customMu === undefined || !Number.isFinite(customMu) || customMu <= 0) {
      return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.INVALID_CUSTOM_MU, "Özel dinamik viskozite (μ) değeri girin (0'dan büyük).");
    }
    rhoUsed = customRho;
    muUsed = customMu;
  } else {
    rhoUsed = fluid.rho;
    muUsed = fluid.mu;
  }

  const pipe = PIPE_ROUGHNESS.find((p) => p.id === pipeId);
  if (!pipe) {
    return fail<PressureLossSuccess>(PRESSURE_LOSS_ERROR.UNKNOWN_PIPE, 'Geçersiz boru malzemesi seçimi.');
  }

  const diameterM = diameterMm / 1000;
  const reynolds = computeReynolds(rhoUsed, muUsed, velocityMs, diameterM);
  const regime = regimeOf(reynolds);
  const f = frictionFactor(reynolds, pipe.eps, diameterM);

  const pressureDropPa = f * (lengthM / diameterM) * ((rhoUsed * velocityMs * velocityMs) / 2);
  const pressureDropKPa = pressureDropPa / 1000;
  const pressureDropBar = pressureDropPa / 100000;
  const headLossM = pressureDropPa / (rhoUsed * GRAVITY);

  if (
    ![reynolds, f, pressureDropPa, pressureDropKPa, pressureDropBar, headLossM].every(Number.isFinite) ||
    pressureDropPa <= 0 ||
    f <= 0
  ) {
    return fail<PressureLossSuccess>(
      PRESSURE_LOSS_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const laminar = reynolds < LAMINAR_MAX;
  const transitional = reynolds >= LAMINAR_MAX && reynolds <= TURBULENT_MIN;
  const note = transitional
    ? 'Akış geçiş (kritik) bölgesinde (2300 ≤ Re ≤ 4000); sürtünme faktörü ve basınç kaybı bu bölgede yaklaşıktır.'
    : undefined;

  const rows: PressureLossRow[] = [
    { label: 'Basınç kaybı (Pa)', value: fmt(pressureDropPa) },
    { label: 'Basınç kaybı (kPa)', value: fmt(pressureDropKPa) },
    { label: 'Basınç kaybı (bar)', value: fmt(pressureDropBar) },
    { label: 'Yük kaybı (mSS)', value: fmt(headLossM) },
  ];

  return {
    ok: true,
    pressureDropPa,
    pressureDropKPa,
    pressureDropBar,
    headLossM,
    reynolds,
    regime,
    frictionFactor: f,
    rows,
    ...(note ? { note } : {}),
    steps: [
      `Reynolds: Re = ρ·v·D/μ = ${fmt(rhoUsed)} × ${fmt(velocityMs)} × ${fmt(diameterM)} / ${fmt(muUsed)} = ${fmt(reynolds)} (${regime})`,
      laminar
        ? `Sürtünme faktörü (laminer): f = 64/Re = ${fmt(f)}`
        : `Sürtünme faktörü (Swamee-Jain): f = ${fmt(f)} (ε = ${fmt(pipe.eps)} m)`,
      `Basınç kaybı: ΔP = f·(L/D)·(ρ·v²/2) = ${fmt(f)} × (${fmt(lengthM)}/${fmt(diameterM)}) × (${fmt(rhoUsed)}×${fmt(velocityMs)}²/2) = ${fmt(pressureDropPa)} Pa = ${fmt(pressureDropKPa)} kPa`,
      `Yük kaybı: h = ΔP/(ρ·g) = ${fmt(pressureDropPa)} / (${fmt(rhoUsed)}×${GRAVITY}) = ${fmt(headLossM)} mSS`,
    ],
  };
}

/** Registry metadata for the pipe pressure-loss calculator. */
export const basincKaybiMeta: Calculator = {
  id: 'borudaki-basinc-kaybi',
  slug: 'boru-basinc-kaybi-hesaplama',
  categoryId: 'thermal',
  title: 'Borudaki Basınç Kaybı (Darcy-Weisbach) Hesaplama',
  description:
    'Akışkan, boru çapı, hız, uzunluk ve malzemeye göre borudaki sürtünme basınç kaybını (Darcy-Weisbach) hesaplayın.',
  keywords: [
    'basınç kaybı hesaplama',
    'darcy weisbach hesaplama',
    'boru basınç kaybı',
    'sürtünme kaybı hesaplama',
    'yük kaybı hesaplama',
    'boru hidrolik hesabı',
  ],
  relatedTools: ['reynolds-sayisi', 'debi-hesaplama', 'pompa-gucu'],
  faq: [
    {
      question: 'Darcy-Weisbach denklemi nedir?',
      answer:
        'Darcy-Weisbach denklemi, bir borudaki sürtünme kaynaklı basınç kaybını ΔP = f · (L/D) · (ρ·v²/2) formülüyle verir: sürtünme faktörü (f) × boru uzunluğu/çap oranı × dinamik basınç (ρ·v²/2). Sonuç Pascal cinsindendir; yük kaybı ise h = ΔP/(ρ·g) ile metre su sütununa (mSS) çevrilir. Pompa seçimi ve boru çapı belirlemede temel bir hesaptır.',
    },
    {
      question: 'Sürtünme faktörü (f) nasıl belirlenir?',
      answer:
        'Sürtünme faktörü akış rejimine bağlıdır. Laminer akışta (Re < 2300) f = 64/Re ile kesin olarak bulunur. Türbülanslı akışta ise boru pürüzlülüğü (ε) ve Reynolds sayısına bağlı Colebrook denklemi çözülür; bu hesapta Colebrook’a çok yakın sonuç veren açık Swamee-Jain bağıntısı kullanılır: f = 0,25 / [log₁₀(ε/(3,7·D) + 5,74/Re^0,9)]². 2300–4000 arası geçiş bölgesinde sonuç yaklaşıktır.',
    },
  ],
};
