/**
 * Steady-state heat conduction (Isı İletimi — Fourier's law) — pure logic.
 *
 * Physics: Q = k · A · ΔT / d — the heat conduction RATE (a power, in watts)
 * through a flat layer of conductivity k (W/(m·K)), area A (m²), thickness d (m)
 * with a temperature difference ΔT (°C/K) across it.
 *
 * CLEAN-PHYSICS tool: thermal conductivities are standard textbook values in an
 * auditable named const table. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

/** Id of the "enter your own k" material. */
export const OZEL_ID = 'ozel';

export interface ConductivityMaterial {
  readonly id: string;
  readonly label: string;
  /** Thermal conductivity k in W/(m·K); null for the user-supplied 'ozel' entry. */
  readonly k: number | null;
}

/**
 * Thermal conductivities k in W/(m·K) — standard textbook values. Auditable
 * named const table; the final 'ozel' row defers to a user-supplied k.
 */
export const CONDUCTIVITY_MATERIALS: readonly ConductivityMaterial[] = [
  { id: 'bakir', label: 'Bakır', k: 401 },
  { id: 'aluminyum', label: 'Alüminyum', k: 237 },
  { id: 'celik', label: 'Çelik', k: 50 },
  { id: 'cam', label: 'Cam', k: 0.8 },
  { id: 'beton', label: 'Beton', k: 1.7 },
  { id: 'ahsap', label: 'Ahşap', k: 0.15 },
  { id: 'yalitim', label: 'Yalıtım (cam yünü)', k: 0.04 },
  { id: OZEL_ID, label: 'Özel (elle gir, W/m·K)', k: null },
];

export interface ConductionRow {
  readonly label: string;
  readonly value: string;
}

export interface HeatConductionInput {
  areaM2: number;
  deltaT: number;
  thicknessMm: number;
  materialId: string;
  /** Thermal conductivity W/(m·K); required only when materialId === 'ozel'. */
  customK?: number;
}

export interface HeatConductionSuccess {
  readonly heatRateW: number;
  readonly heatRateKW: number;
  readonly rows: readonly ConductionRow[];
  readonly kUsed: number;
  readonly materialLabel: string;
  readonly steps: readonly string[];
}

export type HeatConductionResult = CalcResult<HeatConductionSuccess>;

export const HEAT_CONDUCTION_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_AREA: 'NON_POSITIVE_AREA',
  NON_POSITIVE_DELTA: 'NON_POSITIVE_DELTA',
  NON_POSITIVE_THICKNESS: 'NON_POSITIVE_THICKNESS',
  UNKNOWN_MATERIAL: 'UNKNOWN_MATERIAL',
  INVALID_CUSTOM_K: 'INVALID_CUSTOM_K',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the steady-state heat conduction rate Q = k·A·ΔT/d. Pure and total —
 * returns a failure object (never throws) for invalid input.
 */
export function solveHeatConduction(input: HeatConductionInput): HeatConductionResult {
  const { areaM2, deltaT, thicknessMm, materialId, customK } = input;

  if (!Number.isFinite(areaM2)) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.INVALID_NUMBER, 'Geçerli bir alan girin.');
  }
  if (areaM2 <= 0) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.NON_POSITIVE_AREA, "Alan 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(deltaT)) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.INVALID_NUMBER, 'Geçerli bir sıcaklık farkı girin.');
  }
  if (deltaT <= 0) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.NON_POSITIVE_DELTA, "Sıcaklık farkı 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(thicknessMm)) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.INVALID_NUMBER, 'Geçerli bir kalınlık girin.');
  }
  if (thicknessMm <= 0) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.NON_POSITIVE_THICKNESS, "Kalınlık 0'dan büyük olmalı.");
  }

  const material = CONDUCTIVITY_MATERIALS.find((m) => m.id === materialId);
  if (!material) {
    return fail<HeatConductionSuccess>(HEAT_CONDUCTION_ERROR.UNKNOWN_MATERIAL, 'Geçersiz malzeme seçimi.');
  }

  let kUsed: number;
  if (material.k === null) {
    if (customK === undefined || !Number.isFinite(customK) || customK <= 0) {
      return fail<HeatConductionSuccess>(
        HEAT_CONDUCTION_ERROR.INVALID_CUSTOM_K,
        "Özel ısıl iletkenlik (k) değeri girin (0'dan büyük).",
      );
    }
    kUsed = customK;
  } else {
    kUsed = material.k;
  }

  const thicknessM = thicknessMm / 1000;
  const heatRateW = (kUsed * areaM2 * deltaT) / thicknessM;
  const heatRateKW = heatRateW / 1000;

  if (![heatRateW, heatRateKW].every(Number.isFinite) || heatRateW <= 0) {
    return fail<HeatConductionSuccess>(
      HEAT_CONDUCTION_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const rows: ConductionRow[] = [
    { label: 'Isı akısı (W)', value: fmt(heatRateW) },
    { label: 'Isı akısı (kW)', value: fmt(heatRateKW) },
  ];

  return {
    ok: true,
    heatRateW,
    heatRateKW,
    rows,
    kUsed,
    materialLabel: material.label,
    steps: [
      `Isıl iletkenlik: k = ${fmt(kUsed)} W/(m·K) (${material.label})`,
      `Kalınlık: d = ${fmt(thicknessMm)} mm = ${fmt(thicknessM)} m`,
      `Isı akısı: Q = k·A·ΔT / d = ${fmt(kUsed)} × ${fmt(areaM2)} × ${fmt(deltaT)} / ${fmt(thicknessM)} = ${fmt(heatRateW)} W = ${fmt(heatRateKW)} kW`,
    ],
  };
}

/** Registry metadata for the heat-conduction calculator. */
export const isiIletimiMeta: Calculator = {
  id: 'isi-iletimi',
  slug: 'isi-iletimi-hesaplama',
  categoryId: 'thermal',
  title: 'Isı İletimi (Fourier) Hesaplama',
  description:
    'Bir duvar/katman boyunca iletimle geçen ısı akısını (W) hesaplayın; malzeme ısıl iletkenliğine göre.',
  keywords: [
    'ısı iletimi hesaplama',
    'fourier ısı iletimi',
    'ısı transferi iletim',
    'ısıl iletkenlik hesaplama',
    'duvardan ısı kaybı',
    'Q=kAΔT/d',
  ],
  relatedTools: ['isi-transferi', 'isi-kaybi'],
  faq: [
    {
      question: 'Isı iletimi (Fourier yasası) nasıl hesaplanır?',
      answer:
        'Düz bir katmandan iletimle geçen ısı akısı (gücü) Fourier yasasıyla Q = k · A · ΔT / d olarak bulunur: ısıl iletkenlik (k) × yüzey alanı (A) × iki yüz arasındaki sıcaklık farkı (ΔT), katman kalınlığına (d) bölünür. Sonuç watt cinsindendir ve birim zamanda geçen ısı miktarını (gücü) verir; kalınlık arttıkça veya iletkenlik azaldıkça ısı akısı düşer.',
    },
    {
      question: 'Isıl iletkenlik (k) nedir?',
      answer:
        'Isıl iletkenlik k, bir malzemenin ısıyı iletme yeteneğidir; birimi W/(m·K)’dir. Yüksek k ısıyı iyi ileten malzemeleri (bakır ≈ 401, alüminyum ≈ 237 W/m·K), düşük k ise yalıtkanları (cam yünü ≈ 0,04, ahşap ≈ 0,15 W/m·K) belirtir. Yalıtım malzemelerinin k değeri küçüktür; bu yüzden aynı kalınlıkta çok daha az ısı geçirirler.',
    },
  ],
};
