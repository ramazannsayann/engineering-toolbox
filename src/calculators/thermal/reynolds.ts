/**
 * Reynolds number (Reynolds Sayısı) calculator — pure logic.
 *
 * Physics: Re = ρ·v·D / μ — a dimensionless ratio of inertial to viscous forces
 * that predicts the flow regime in a pipe. ρ = density (kg/m³), v = velocity
 * (m/s), D = pipe inner diameter (m), μ = dynamic viscosity (Pa·s).
 *
 * CLEAN-PHYSICS tool: the fluid properties are standard textbook values at
 * ~20 °C, kept in an auditable named const table. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

/** Below this Re the flow is laminar. */
export const LAMINAR_MAX = 2300;
/** Above this Re the flow is fully turbulent (between is the transitional band). */
export const TURBULENT_MIN = 4000;

/** Id of the "enter your own ρ and μ" fluid. */
export const OZEL_ID = 'ozel';

export interface Fluid {
  readonly id: string;
  readonly label: string;
  /** Density kg/m³ (null for the user-supplied 'ozel' entry). */
  readonly rho: number | null;
  /** Dynamic viscosity Pa·s (null for the user-supplied 'ozel' entry). */
  readonly mu: number | null;
}

/**
 * Fluid properties at ~20 °C — standard textbook values. Auditable named const
 * table; the final 'ozel' row defers to user-supplied ρ and μ.
 */
export const FLUIDS: readonly Fluid[] = [
  { id: 'su', label: 'Su', rho: 998, mu: 0.001002 },
  { id: 'hava', label: 'Hava', rho: 1.204, mu: 0.0000181 },
  { id: 'yag', label: 'Yağ (SAE 30)', rho: 891, mu: 0.29 },
  { id: OZEL_ID, label: 'Özel (elle gir)', rho: null, mu: null },
];

export interface ReynoldsInput {
  velocityMs: number;
  diameterMm: number;
  fluidId: string;
  /** Density kg/m³; required (and used) only when fluidId === 'ozel'. */
  customRho?: number;
  /** Dynamic viscosity Pa·s; required (and used) only when fluidId === 'ozel'. */
  customMu?: number;
}

export interface ReynoldsSuccess {
  readonly reynolds: number;
  readonly regime: string;
  readonly rhoUsed: number;
  readonly muUsed: number;
  readonly steps: readonly string[];
}

export type ReynoldsResult = CalcResult<ReynoldsSuccess>;

export const REYNOLDS_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VELOCITY: 'NON_POSITIVE_VELOCITY',
  NON_POSITIVE_DIAMETER: 'NON_POSITIVE_DIAMETER',
  UNKNOWN_FLUID: 'UNKNOWN_FLUID',
  INVALID_CUSTOM_RHO: 'INVALID_CUSTOM_RHO',
  INVALID_CUSTOM_MU: 'INVALID_CUSTOM_MU',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/** Classify the flow regime from the Reynolds number. */
export function regimeOf(re: number): string {
  if (re < LAMINAR_MAX) return 'Laminer';
  if (re <= TURBULENT_MIN) return 'Geçiş (kritik) bölgesi';
  return 'Türbülanslı';
}

/**
 * Compute the Reynolds number and flow regime. Pure and total — returns a
 * failure object (never throws) for invalid input.
 */
export function solveReynolds(input: ReynoldsInput): ReynoldsResult {
  const { velocityMs, diameterMm, fluidId, customRho, customMu } = input;

  if (!Number.isFinite(velocityMs)) {
    return fail<ReynoldsSuccess>(REYNOLDS_ERROR.INVALID_NUMBER, 'Geçerli bir hız girin.');
  }
  if (velocityMs <= 0) {
    return fail<ReynoldsSuccess>(REYNOLDS_ERROR.NON_POSITIVE_VELOCITY, "Hız 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(diameterMm)) {
    return fail<ReynoldsSuccess>(REYNOLDS_ERROR.INVALID_NUMBER, 'Geçerli bir çap girin.');
  }
  if (diameterMm <= 0) {
    return fail<ReynoldsSuccess>(REYNOLDS_ERROR.NON_POSITIVE_DIAMETER, "Çap 0'dan büyük olmalı.");
  }

  const fluid = FLUIDS.find((f) => f.id === fluidId);
  if (!fluid) {
    return fail<ReynoldsSuccess>(REYNOLDS_ERROR.UNKNOWN_FLUID, 'Geçersiz akışkan seçimi.');
  }

  let rhoUsed: number;
  let muUsed: number;
  if (fluid.rho === null || fluid.mu === null) {
    // 'ozel' — the user must supply both properties.
    if (customRho === undefined || !Number.isFinite(customRho) || customRho <= 0) {
      return fail<ReynoldsSuccess>(REYNOLDS_ERROR.INVALID_CUSTOM_RHO, "Özel yoğunluk (ρ) değeri girin (0'dan büyük).");
    }
    if (customMu === undefined || !Number.isFinite(customMu) || customMu <= 0) {
      return fail<ReynoldsSuccess>(REYNOLDS_ERROR.INVALID_CUSTOM_MU, "Özel dinamik viskozite (μ) değeri girin (0'dan büyük).");
    }
    rhoUsed = customRho;
    muUsed = customMu;
  } else {
    rhoUsed = fluid.rho;
    muUsed = fluid.mu;
  }

  const diameterM = diameterMm / 1000;
  const reynolds = (rhoUsed * velocityMs * diameterM) / muUsed;

  if (!Number.isFinite(reynolds) || reynolds <= 0) {
    return fail<ReynoldsSuccess>(
      REYNOLDS_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const regime = regimeOf(reynolds);
  const band =
    reynolds < LAMINAR_MAX ? 'Re < 2300' : reynolds <= TURBULENT_MIN ? '2300 ≤ Re ≤ 4000' : 'Re > 4000';

  return {
    ok: true,
    reynolds,
    regime,
    rhoUsed,
    muUsed,
    steps: [
      `Çap: D = ${fmt(diameterMm)} mm = ${fmt(diameterM)} m`,
      `Reynolds: Re = ρ·v·D / μ = ${fmt(rhoUsed)} × ${fmt(velocityMs)} × ${fmt(diameterM)} / ${fmt(muUsed)} = ${fmt(reynolds)}`,
      `Rejim: ${regime} (${band})`,
    ],
  };
}

/** Registry metadata for the Reynolds number calculator. */
export const reynoldsMeta: Calculator = {
  id: 'reynolds-sayisi',
  slug: 'reynolds-sayisi-hesaplama',
  categoryId: 'thermal',
  title: 'Reynolds Sayısı Hesaplama',
  description:
    'Akışkan, boru çapı ve hızdan Reynolds sayısını hesaplayın ve akış rejimini (laminer/türbülanslı) belirleyin.',
  keywords: [
    'reynolds sayısı hesaplama',
    'reynolds number',
    'laminer türbülanslı akış',
    'akış rejimi',
    'reynolds hesaplama',
  ],
  relatedTools: ['debi-hesaplama', 'borudaki-basinc-kaybi'],
  faq: [
    {
      question: 'Reynolds sayısı nedir, ne işe yarar?',
      answer:
        'Reynolds sayısı (Re), bir akışkandaki atalet kuvvetlerinin viskoz kuvvetlere oranını veren boyutsuz bir sayıdır: Re = ρ·v·D / μ (yoğunluk × hız × çap / dinamik viskozite). Akışın laminer mi yoksa türbülanslı mı olduğunu öngörmek için kullanılır; boru çapı, pompa ve basınç kaybı hesaplarında akış rejimini belirlemede temel rol oynar.',
    },
    {
      question: 'Laminer ve türbülanslı akış farkı nedir?',
      answer:
        'Genel kabul gören sınırlara göre Re < 2300 ise akış laminerdir (düzgün, katmanlı akış); Re > 4000 ise türbülanslıdır (karışık, çalkantılı akış); 2300 ile 4000 arası ise geçiş (kritik) bölgesidir. Türbülanslı akışta sürtünme ve basınç kaybı laminer akışa göre belirgin biçimde artar.',
    },
  ],
};
