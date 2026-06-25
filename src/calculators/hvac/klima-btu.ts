/**
 * AC cooling load / BTU calculator (Klima BTU) — pure logic.
 *
 * GROUP-B tool: a room's cooling load has NO single correct answer (it depends
 * on climate, insulation, glazing/orientation, occupancy, equipment…). We use
 * SENSIBLE, COMMON middle-of-the-road coefficients — all kept as named consts
 * below so they're auditable in ONE place (like the cable-sizing ampacity
 * table) — and the UI carries a clear "preliminary estimate" disclaimer.
 *
 * Both modes share ONE core: Simple = Detailed with default assumptions, so
 * switching modes gives a consistent magnitude. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';
import { powerRows, KW_TO_BTU_PER_H, type PowerRow } from './power-units';

// ── Coefficients (common rules-of-thumb for moderate conditions) ─────────────
/** Base sensible load per m³ of room volume (≈35 W/m³ is a common estimate). */
export const BASE_W_PER_M3 = 35;
/** Added load per person beyond the first occupant. */
export const PERSON_W = 100;
/** Window solar/conduction gain per m² of glazing (before orientation). */
export const WINDOW_W_PER_M2 = 60;
/** Base multiplier when the room gets a lot of direct sun. */
export const SUN_FACTOR_HIGH = 1.15;
/** Defaults that Simple mode folds in for the Detailed-only inputs. */
export const SIMPLE_DEVICE_W = 300;
export const SIMPLE_WINDOW_AREA_M2 = 2;
export const SIMPLE_WINDOW_ORIENTATION = 'guney';
export const SIMPLE_INSULATION = 'orta';

export type Orientation = 'kuzey' | 'dogu' | 'bati' | 'guney';
export type Insulation = 'iyi' | 'orta' | 'zayif';

/** Window orientation factor (N. hemisphere: south/west higher). */
export const ORIENTATION_FACTOR: Record<Orientation, number> = {
  kuzey: 0.6,
  dogu: 0.9,
  guney: 0.8,
  bati: 1.0,
};
/** Whole-load multiplier by insulation quality. */
export const INSULATION_FACTOR: Record<Insulation, number> = {
  iyi: 0.9,
  orta: 1.0,
  zayif: 1.15,
};

/** Common market AC capacities (BTU/h) for the recommendation ladder. */
export const STANDARD_AC_BTU = [9000, 12000, 18000, 24000, 30000, 36000, 48000] as const;

// ── Types ────────────────────────────────────────────────────────────────────
export interface AcBtuSimpleInput {
  mode: 'simple';
  areaM2: number;
  ceilingM: number;
  people: number;
  highSun: boolean;
}

export interface AcBtuDetailedInput {
  mode: 'detailed';
  areaM2: number;
  ceilingM: number;
  people: number;
  highSun: boolean;
  deviceW: number;
  windowAreaM2: number;
  windowOrientation: Orientation;
  insulation: Insulation;
}

export type AcBtuInput = AcBtuSimpleInput | AcBtuDetailedInput;

export interface BreakdownItem {
  readonly label: string;
  readonly watts: number;
}

export interface AcBtuSuccess {
  readonly totalW: number;
  readonly kW: number;
  readonly btuPerHour: number;
  /** Recommended standard AC size (BTU/h), or null if above 48000. */
  readonly recommendedBtu: number | null;
  /** Power in kW / BTU·h / kcal·h. */
  readonly rows: readonly PowerRow[];
  /** Per-line-item contributions (sum to totalW). */
  readonly breakdown: readonly BreakdownItem[];
  readonly steps: readonly string[];
  readonly note?: string;
}

export type AcBtuResult = CalcResult<AcBtuSuccess>;

export const AC_BTU_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_AREA: 'NON_POSITIVE_AREA',
  NON_POSITIVE_CEILING: 'NON_POSITIVE_CEILING',
  INVALID_PEOPLE: 'INVALID_PEOPLE',
  NEGATIVE_VALUE: 'NEGATIVE_VALUE',
  INVALID_ENUM: 'INVALID_ENUM',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

interface CoreParams {
  areaM2: number;
  ceilingM: number;
  people: number;
  highSun: boolean;
  deviceW: number;
  windowAreaM2: number;
  windowOrientation: Orientation;
  insulation: Insulation;
}

/** Fill Simple inputs with the documented defaults so both modes share one core. */
function toCoreParams(input: AcBtuInput): CoreParams {
  if (input.mode === 'simple') {
    return {
      areaM2: input.areaM2,
      ceilingM: input.ceilingM,
      people: input.people,
      highSun: input.highSun,
      deviceW: SIMPLE_DEVICE_W,
      windowAreaM2: SIMPLE_WINDOW_AREA_M2,
      windowOrientation: SIMPLE_WINDOW_ORIENTATION,
      insulation: SIMPLE_INSULATION,
    };
  }
  return {
    areaM2: input.areaM2,
    ceilingM: input.ceilingM,
    people: input.people,
    highSun: input.highSun,
    deviceW: input.deviceW,
    windowAreaM2: input.windowAreaM2,
    windowOrientation: input.windowOrientation,
    insulation: input.insulation,
  };
}

/**
 * Compute the estimated cooling load and a recommended standard AC size. Pure
 * and total — returns a failure object (never throws) for invalid input.
 */
export function solveAcBtu(input: AcBtuInput): AcBtuResult {
  const p = toCoreParams(input);

  if (!Number.isFinite(p.areaM2)) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.INVALID_NUMBER, 'Geçerli bir alan girin.');
  }
  if (p.areaM2 <= 0) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.NON_POSITIVE_AREA, "Alan 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(p.ceilingM)) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.INVALID_NUMBER, 'Geçerli bir tavan yüksekliği girin.');
  }
  if (p.ceilingM <= 0) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.NON_POSITIVE_CEILING, "Tavan yüksekliği 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(p.people) || !Number.isInteger(p.people) || p.people < 0) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.INVALID_PEOPLE, 'Kişi sayısı 0 veya daha büyük bir tam sayı olmalı.');
  }
  if (!Number.isFinite(p.deviceW) || p.deviceW < 0) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.NEGATIVE_VALUE, 'Cihaz yükü negatif olamaz.');
  }
  if (!Number.isFinite(p.windowAreaM2) || p.windowAreaM2 < 0) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.NEGATIVE_VALUE, 'Pencere alanı negatif olamaz.');
  }
  if (!(p.windowOrientation in ORIENTATION_FACTOR)) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.INVALID_ENUM, 'Geçersiz pencere yönü.');
  }
  if (!(p.insulation in INSULATION_FACTOR)) {
    return fail<AcBtuSuccess>(AC_BTU_ERROR.INVALID_ENUM, 'Geçersiz yalıtım seçimi.');
  }

  const base = p.areaM2 * p.ceilingM * BASE_W_PER_M3;
  const sunBase = base * (p.highSun ? SUN_FACTOR_HIGH : 1);
  const peopleW = Math.max(0, p.people - 1) * PERSON_W;
  const deviceW = p.deviceW;
  const windowW = p.windowAreaM2 * WINDOW_W_PER_M2 * ORIENTATION_FACTOR[p.windowOrientation];
  const subtotal = sunBase + peopleW + deviceW + windowW;
  const insFactor = INSULATION_FACTOR[p.insulation];
  const totalW = subtotal * insFactor;
  const insulationDelta = totalW - subtotal; // subtotal × (insFactor − 1)

  const kW = totalW / 1000;
  const btuPerHour = kW * KW_TO_BTU_PER_H;

  if (![totalW, kW, btuPerHour].every(Number.isFinite) || totalW <= 0) {
    return fail<AcBtuSuccess>(
      AC_BTU_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const recommendedBtu = STANDARD_AC_BTU.find((b) => b >= btuPerHour) ?? null;
  const note =
    recommendedBtu === null
      ? 'Hesaplanan yük en yüksek standart kapasiteyi (48000 BTU) aşıyor; birden fazla ünite veya VRF sistemi gerekebilir.'
      : undefined;

  const breakdown: BreakdownItem[] = [
    { label: 'Taban yükü (hacim, güneş dahil)', watts: sunBase },
    { label: 'Kişiler', watts: peopleW },
    { label: 'Cihaz & aydınlatma', watts: deviceW },
    { label: 'Pencereler', watts: windowW },
    { label: 'Yalıtım düzeltmesi', watts: insulationDelta },
  ];

  return {
    ok: true,
    totalW,
    kW,
    btuPerHour,
    recommendedBtu,
    rows: powerRows(kW, formatNumber),
    breakdown,
    ...(note ? { note } : {}),
    steps: [
      `Taban yükü: ${fmt(p.areaM2)} × ${fmt(p.ceilingM)} × ${BASE_W_PER_M3}${p.highSun ? ` × ${SUN_FACTOR_HIGH}` : ''} = ${fmt(sunBase)} W`,
      `Isı kazançları: ${fmt(sunBase)} + ${fmt(peopleW)} (kişi) + ${fmt(deviceW)} (cihaz) + ${fmt(windowW)} (pencere) = ${fmt(subtotal)} W`,
      `Yalıtım (×${fmt(insFactor)}): ${fmt(subtotal)} × ${fmt(insFactor)} = ${fmt(totalW)} W`,
      `Soğutma yükü: ${fmt(totalW)} W = ${fmt(kW)} kW = ${fmt(btuPerHour)} BTU/saat`,
      recommendedBtu !== null
        ? `Önerilen klima: ${recommendedBtu} BTU`
        : 'Önerilen klima: 48000 BTU üzeri (çoklu ünite / VRF)',
    ],
  };
}

/** Registry metadata for the AC BTU calculator. */
export const klimaBtuMeta: Calculator = {
  id: 'klima-btu',
  slug: 'klima-btu-hesaplama',
  categoryId: 'hvac',
  title: 'Klima BTU Hesaplama',
  description:
    'Oda için gereken klima soğutma kapasitesini (BTU/saat ve kW) hesaplayın; basit veya detaylı mod. Sonuç ön tahmindir.',
  keywords: [
    'klima btu hesaplama',
    'kaç btu klima',
    'klima kapasitesi hesaplama',
    'oda soğutma yükü',
    'btu hesaplama',
    'klima seçimi',
  ],
  relatedTools: ['su-isitma-gucu', 'isi-kaybi', 'pompa-gucu'],
  faq: [
    {
      question: 'Klima BTU hesabı nasıl yapılır?',
      answer:
        'Klima kapasitesi, odanın hacmine (alan × tavan yüksekliği) dayalı bir taban soğutma yüküne; kişi sayısı, cihaz/aydınlatma, pencerelerden gelen güneş kazancı ve yalıtım gibi ek ısı kazançlarının eklenmesiyle tahmin edilir. Toplam watt değeri BTU/saate çevrilip (1 kW ≈ 3412 BTU/saat) en yakın standart klima kapasitesine yuvarlanır. Bu yöntem tipik koşullar için bir ön tahmindir.',
    },
    {
      question: "Kaç m²'ye kaç BTU gerekir?",
      answer:
        'Kaba bir kılavuz olarak ılıman koşullarda metrekare başına yaklaşık 600–700 BTU/saat alınabilir (örneğin 20 m² için ~12000–14000 BTU). Ancak bu yalnızca yaklaşık bir başlangıç değeridir: tavan yüksekliği, yön, güneş alma durumu, yalıtım, kişi ve cihaz sayısı sonucu önemli ölçüde değiştirir. Kesin seçim için profesyonel bir ısı kazancı hesabı gerekir.',
    },
  ],
};
