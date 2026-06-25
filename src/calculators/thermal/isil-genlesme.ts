/**
 * Thermal (linear) expansion (Isıl Genleşme) calculator — pure logic.
 *
 * Physics: ΔL = α · L · ΔT — the change in length of a solid of original length
 * L (m) and linear expansion coefficient α (1/°C) under a temperature change ΔT
 * (°C). ΔT may be negative (cooling ⇒ contraction / kısalma).
 *
 * CLEAN-PHYSICS tool: the expansion coefficients are standard textbook values,
 * kept in an auditable named const table. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

/** Id of the "enter your own α" material. */
export const OZEL_ID = 'ozel';

export interface ExpansionMaterial {
  readonly id: string;
  readonly label: string;
  /** Linear expansion coefficient 1/°C (null for the user-supplied 'ozel' entry). */
  readonly alpha: number | null;
}

/**
 * Linear expansion coefficients α in 1/°C — standard textbook values (near room
 * temperature). Auditable named const table; the final 'ozel' row defers to a
 * user-supplied α.
 */
export const EXPANSION_MATERIALS: readonly ExpansionMaterial[] = [
  { id: 'celik', label: 'Çelik', alpha: 12e-6 },
  { id: 'aluminyum', label: 'Alüminyum', alpha: 23e-6 },
  { id: 'bakir', label: 'Bakır', alpha: 17e-6 },
  { id: 'beton', label: 'Beton', alpha: 12e-6 },
  { id: 'cam', label: 'Cam', alpha: 9e-6 },
  { id: 'pvc', label: 'PVC', alpha: 80e-6 },
  { id: OZEL_ID, label: 'Özel (elle gir, 1/°C)', alpha: null },
];

export interface ThermalExpansionInput {
  lengthM: number;
  /** Temperature change ΔT in °C (may be negative for cooling). */
  deltaT: number;
  materialId: string;
  /** Linear expansion coefficient 1/°C; required only when materialId === 'ozel'. */
  customAlpha?: number;
}

export interface ThermalExpansionSuccess {
  readonly deltaLmm: number;
  readonly deltaLm: number;
  readonly newLengthM: number;
  readonly alphaUsed: number;
  readonly materialLabel: string;
  /** 'uzama' (expansion) or 'kısalma' (contraction). */
  readonly direction: string;
  readonly steps: readonly string[];
}

export type ThermalExpansionResult = CalcResult<ThermalExpansionSuccess>;

export const THERMAL_EXPANSION_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_LENGTH: 'NON_POSITIVE_LENGTH',
  ZERO_DELTA: 'ZERO_DELTA',
  UNKNOWN_MATERIAL: 'UNKNOWN_MATERIAL',
  INVALID_CUSTOM_ALPHA: 'INVALID_CUSTOM_ALPHA',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the linear thermal expansion ΔL = α·L·ΔT (allowing negative ΔT for
 * contraction). Pure and total — returns a failure object (never throws) for
 * invalid input.
 */
export function solveThermalExpansion(input: ThermalExpansionInput): ThermalExpansionResult {
  const { lengthM, deltaT, materialId, customAlpha } = input;

  if (!Number.isFinite(lengthM)) {
    return fail<ThermalExpansionSuccess>(THERMAL_EXPANSION_ERROR.INVALID_NUMBER, 'Geçerli bir boy girin.');
  }
  if (lengthM <= 0) {
    return fail<ThermalExpansionSuccess>(THERMAL_EXPANSION_ERROR.NON_POSITIVE_LENGTH, "Boy 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(deltaT)) {
    return fail<ThermalExpansionSuccess>(THERMAL_EXPANSION_ERROR.INVALID_NUMBER, 'Geçerli bir sıcaklık farkı girin.');
  }
  if (deltaT === 0) {
    return fail<ThermalExpansionSuccess>(THERMAL_EXPANSION_ERROR.ZERO_DELTA, 'Sıcaklık farkı 0 olamaz.');
  }

  const material = EXPANSION_MATERIALS.find((m) => m.id === materialId);
  if (!material) {
    return fail<ThermalExpansionSuccess>(THERMAL_EXPANSION_ERROR.UNKNOWN_MATERIAL, 'Geçersiz malzeme seçimi.');
  }

  let alphaUsed: number;
  if (material.alpha === null) {
    // 'ozel' — the user must supply a valid (positive) coefficient.
    if (customAlpha === undefined || !Number.isFinite(customAlpha) || customAlpha <= 0) {
      return fail<ThermalExpansionSuccess>(
        THERMAL_EXPANSION_ERROR.INVALID_CUSTOM_ALPHA,
        "Özel genleşme katsayısı (α) girin (0'dan büyük).",
      );
    }
    alphaUsed = customAlpha;
  } else {
    alphaUsed = material.alpha;
  }

  const deltaLm = alphaUsed * lengthM * deltaT;
  const deltaLmm = deltaLm * 1000;
  const newLengthM = lengthM + deltaLm;

  if (![deltaLm, deltaLmm, newLengthM].every(Number.isFinite) || newLengthM <= 0) {
    return fail<ThermalExpansionSuccess>(
      THERMAL_EXPANSION_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const direction = deltaLm >= 0 ? 'uzama' : 'kısalma';

  return {
    ok: true,
    deltaLmm,
    deltaLm,
    newLengthM,
    alphaUsed,
    materialLabel: material.label,
    direction,
    steps: [
      `Genleşme katsayısı: α = ${fmt(alphaUsed)} 1/°C (${material.label})`,
      `Uzama: ΔL = α·L·ΔT = ${fmt(alphaUsed)} × ${fmt(lengthM)} × ${fmt(deltaT)} = ${fmt(deltaLm)} m = ${fmt(deltaLmm)} mm`,
      `Yeni boy (${direction}): ${fmt(lengthM)} + (${fmt(deltaLm)}) = ${fmt(newLengthM)} m`,
    ],
  };
}

/** Registry metadata for the thermal-expansion calculator. */
export const isilGenlesmeMeta: Calculator = {
  id: 'isil-genlesme',
  slug: 'isil-genlesme-hesaplama',
  categoryId: 'thermal',
  title: 'Isıl Genleşme Hesaplama',
  description:
    'Sıcaklık değişimiyle bir malzemenin boyca uzamasını (ΔL) hesaplayın; malzeme genleşme katsayısına göre.',
  keywords: [
    'ısıl genleşme hesaplama',
    'termal genleşme',
    'boyca uzama hesaplama',
    'genleşme katsayısı',
    'metal genleşmesi',
    'ΔL hesaplama',
  ],
  relatedTools: ['isi-transferi', 'sicaklik-donusturucu'],
  faq: [
    {
      question: 'Isıl genleşme nasıl hesaplanır?',
      answer:
        'Boyca (lineer) ısıl genleşme ΔL = α · L · ΔT formülüyle bulunur: malzemenin genleşme katsayısı (α, 1/°C) × ilk boy (L) × sıcaklık farkı (ΔT). Sıcaklık artarsa malzeme uzar (ΔL > 0); sıcaklık düşerse (ΔT negatif) kısalır (ΔL < 0). Yeni boy, ilk boya ΔL eklenerek bulunur.',
    },
    {
      question: 'Genleşme katsayısı (α) nedir?',
      answer:
        'Lineer genleşme katsayısı α, bir malzemenin sıcaklığı 1 °C arttığında birim boyunun ne kadar uzadığını gösterir; birimi 1/°C’dir. Örneğin çelik için ≈ 12×10⁻⁶, alüminyum için ≈ 23×10⁻⁶, PVC için ≈ 80×10⁻⁶ 1/°C alınır. Değer ne kadar büyükse malzeme aynı sıcaklık değişiminde o kadar çok genleşir. Buradaki değerler oda sıcaklığı civarı için tipiktir.',
    },
  ],
};
