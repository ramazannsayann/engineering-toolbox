/**
 * Heat transfer / sensible heat (Isı Transferi) calculator — pure logic.
 *
 * Physics: Q = m · c · ΔT — the sensible heat to change a mass m (kg) of a
 * material with specific heat c (J/(kg·°C)) by a temperature difference ΔT (°C).
 * Output energy Q in joules, also expressed in kJ, kWh and kcal.
 *
 * This is the generalized version of the HVAC water-heating tool: instead of a
 * fixed water c = 4186, the user picks a MATERIAL (each with a well-known
 * textbook specific heat) or supplies a custom c. CLEAN-PHYSICS tool — no
 * opaque/assumption tables. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

// ── Energy unit conversions (exact) ──────────────────────────────────────────
/** 1 kJ = 1000 J. */
export const J_PER_KJ = 1000;
/** 1 kWh = 3,600,000 J. */
export const J_PER_KWH = 3_600_000;
/** 1 kcal = 4186 J (thermochemical-ish; matches water's c so 1 kg·1 °C ⇒ 1 kcal). */
export const J_PER_KCAL = 4186;

/** Id of the "enter your own c" material. */
export const OZEL_ID = 'ozel';

export interface Material {
  readonly id: string;
  readonly label: string;
  /** Specific heat J/(kg·°C); null for the user-supplied 'ozel' entry. */
  readonly c: number | null;
}

/**
 * Specific heats c in J/(kg·°C) — standard textbook values at ~room temperature.
 * Auditable named const table; the final 'ozel' row defers to a user-supplied c.
 */
export const SPECIFIC_HEATS: readonly Material[] = [
  { id: 'su', label: 'Su', c: 4186 },
  { id: 'hava', label: 'Hava', c: 1005 },
  { id: 'demir', label: 'Demir', c: 449 },
  { id: 'bakir', label: 'Bakır', c: 385 },
  { id: 'aluminyum', label: 'Alüminyum', c: 897 },
  { id: 'beton', label: 'Beton', c: 880 },
  { id: 'cam', label: 'Cam', c: 840 },
  { id: 'ahsap', label: 'Ahşap', c: 1700 },
  { id: OZEL_ID, label: 'Özel (elle gir)', c: null },
];

export interface EnergyRow {
  readonly label: string;
  readonly value: string;
}

export interface HeatTransferInput {
  /** Mass in kg. */
  massKg: number;
  /** Temperature change ΔT in °C / K. */
  deltaT: number;
  /** Material id from SPECIFIC_HEATS (or 'ozel'). */
  materialId: string;
  /** Specific heat J/(kg·°C); required (and used) only when materialId === 'ozel'. */
  customC?: number;
}

export interface HeatTransferSuccess {
  readonly joules: number;
  readonly kJ: number;
  readonly kWh: number;
  readonly kcal: number;
  /** Energy expressed in kJ / kWh / kcal (copyable rows). */
  readonly rows: readonly EnergyRow[];
  /** The specific heat actually used (looked-up or custom). */
  readonly cUsed: number;
  readonly materialLabel: string;
  readonly steps: readonly string[];
}

export type HeatTransferResult = CalcResult<HeatTransferSuccess>;

export const HEAT_TRANSFER_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_MASS: 'NON_POSITIVE_MASS',
  NON_POSITIVE_DELTA: 'NON_POSITIVE_DELTA',
  UNKNOWN_MATERIAL: 'UNKNOWN_MATERIAL',
  INVALID_CUSTOM_C: 'INVALID_CUSTOM_C',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the heat energy Q = m·c·ΔT and its kJ/kWh/kcal equivalents. Pure and
 * total — returns a failure object (never throws) for invalid input.
 */
export function solveHeatTransfer(input: HeatTransferInput): HeatTransferResult {
  const { massKg, deltaT, materialId, customC } = input;

  if (!Number.isFinite(massKg)) {
    return fail<HeatTransferSuccess>(HEAT_TRANSFER_ERROR.INVALID_NUMBER, 'Geçerli bir kütle girin.');
  }
  if (massKg <= 0) {
    return fail<HeatTransferSuccess>(HEAT_TRANSFER_ERROR.NON_POSITIVE_MASS, "Kütle 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(deltaT)) {
    return fail<HeatTransferSuccess>(HEAT_TRANSFER_ERROR.INVALID_NUMBER, 'Geçerli bir sıcaklık farkı girin.');
  }
  if (deltaT <= 0) {
    return fail<HeatTransferSuccess>(HEAT_TRANSFER_ERROR.NON_POSITIVE_DELTA, "Sıcaklık farkı 0'dan büyük olmalı.");
  }

  const material = SPECIFIC_HEATS.find((m) => m.id === materialId);
  if (!material) {
    return fail<HeatTransferSuccess>(HEAT_TRANSFER_ERROR.UNKNOWN_MATERIAL, 'Geçersiz malzeme seçimi.');
  }

  let cUsed: number;
  if (material.c === null) {
    // 'ozel' — the user must supply a valid specific heat.
    if (customC === undefined || !Number.isFinite(customC) || customC <= 0) {
      return fail<HeatTransferSuccess>(
        HEAT_TRANSFER_ERROR.INVALID_CUSTOM_C,
        "Özel öz ısı değeri girin (0'dan büyük).",
      );
    }
    cUsed = customC;
  } else {
    cUsed = material.c;
  }

  const joules = massKg * cUsed * deltaT;
  const kJ = joules / J_PER_KJ;
  const kWh = joules / J_PER_KWH;
  const kcal = joules / J_PER_KCAL;

  if (![joules, kJ, kWh, kcal].every(Number.isFinite) || joules <= 0) {
    return fail<HeatTransferSuccess>(
      HEAT_TRANSFER_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const rows: EnergyRow[] = [
    { label: 'Enerji (kJ)', value: fmt(kJ) },
    { label: 'Enerji (kWh)', value: fmt(kWh) },
    { label: 'Enerji (kcal)', value: fmt(kcal) },
  ];

  return {
    ok: true,
    joules,
    kJ,
    kWh,
    kcal,
    rows,
    cUsed,
    materialLabel: material.label,
    steps: [
      `Öz ısı: c = ${fmt(cUsed)} J/(kg·°C) (${material.label})`,
      `Isı enerjisi: Q = m × c × ΔT = ${fmt(massKg)} × ${fmt(cUsed)} × ${fmt(deltaT)} = ${fmt(joules)} J`,
      `Enerji: ${fmt(kJ)} kJ = ${fmt(kWh)} kWh = ${fmt(kcal)} kcal`,
    ],
  };
}

/** Registry metadata for the heat-transfer calculator. */
export const isiTransferiMeta: Calculator = {
  id: 'isi-transferi',
  slug: 'isi-transferi-hesaplama',
  categoryId: 'thermal',
  title: 'Isı Transferi (Q = m·c·ΔT) Hesaplama',
  description:
    'Bir maddeyi ısıtmak/soğutmak için gereken ısı enerjisini (kJ, kWh, kcal) hesaplayın; malzeme öz ısısına göre.',
  keywords: [
    'ısı transferi hesaplama',
    'q=mcΔt hesaplama',
    'öz ısı hesaplama',
    'ısı enerjisi hesaplama',
    'ısı miktarı hesaplama',
    'specific heat hesaplama',
  ],
  relatedTools: ['su-isitma-gucu', 'sicaklik-donusturucu'],
  faq: [
    {
      question: 'Isı transferi (Q=m·c·ΔT) nasıl hesaplanır?',
      answer:
        'Bir maddenin sıcaklığını değiştirmek için gereken ısı enerjisi Q = m × c × ΔT formülüyle bulunur: kütle (kg) × maddenin öz ısısı c (J/kg·°C) × sıcaklık farkı ΔT (°C). Sonuç joule cinsinden çıkar ve kJ (÷1000), kWh (÷3.600.000) ve kcal (÷4186) birimlerine çevrilir. Örneğin 1 kg suyu 80 °C ısıtmak: 1 × 4186 × 80 = 334.880 J ≈ 334,88 kJ ≈ 80 kcal.',
    },
    {
      question: 'Öz ısı (c) nedir?',
      answer:
        'Öz ısı (özgül ısı, c), 1 kg maddenin sıcaklığını 1 °C artırmak için gereken enerji miktarıdır; birimi J/(kg·°C). Su için yaklaşık 4186, demir için 449, bakır için 385, alüminyum için 897 J/(kg·°C) alınır. Değer ne kadar yüksekse maddeyi ısıtmak o kadar çok enerji gerektirir. Buradaki değerler oda sıcaklığı için tipik kabul edilmiştir.',
    },
  ],
};
