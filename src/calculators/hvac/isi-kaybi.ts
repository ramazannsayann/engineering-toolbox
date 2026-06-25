/**
 * Heat loss / heating load (Isı Kaybı) calculator — pure logic.
 *
 * GROUP-B tool: a room's heating load has NO single correct answer (it depends
 * on climate, the city's design outdoor temperature, insulation, glazing,
 * orientation, infiltration…). We use SENSIBLE, COMMON middle-of-the-road
 * coefficients — all kept as named consts below so they're auditable in ONE
 * place (like the cable-sizing ampacity table) — and the UI carries a clear
 * "preliminary estimate" disclaimer.
 *
 * This is the HEATING analog of the AC BTU tool, with one key difference: the
 * indoor–outdoor temperature difference ΔT is a USER INPUT, because heating
 * load scales directly with ΔT and ΔT varies hugely by city/climate (unlike the
 * AC tool's fixed assumption).
 *
 * Both modes share ONE core: Simple = Detailed with documented defaults, so
 * switching modes gives a consistent magnitude. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';
import { powerRows, KW_TO_KCAL_PER_H, type PowerRow } from './power-units';

// ── Coefficients (common rules-of-thumb for moderate conditions) ─────────────
/**
 * Volumetric heat-loss coefficient at moderate insulation:
 *   load = volume(m³) × ΔT(K) × this × insulationFactor × exposureFactor.
 * 0.5 W/(m³·K) bundles average fabric + infiltration loss for a moderately
 * insulated room (e.g. 54 m³ × ΔT 30 × 0.5 ≈ 810 W base).
 */
export const BASE_W_PER_M3_PER_K = 0.5;
/** Window conduction loss per m² of glazing per K (≈ a U-value of 3). [Detailed] */
export const WINDOW_W_PER_M2_PER_K = 3.0;

export type Insulation = 'iyi' | 'orta' | 'zayif';
export type Exposure = 'normal' | 'kose';

/** Whole-base multiplier by insulation quality (poorer insulation loses more). */
export const INSULATION_FACTOR: Record<Insulation, number> = {
  iyi: 0.8,
  orta: 1.0,
  zayif: 1.3,
};
/** Whole-base multiplier for exposure (corner / more-exposed rooms lose more). */
export const EXPOSURE_FACTOR: Record<Exposure, number> = {
  normal: 1.0,
  kose: 1.15,
};

/**
 * Defaults that Simple mode folds in for the Detailed-only inputs.
 *
 * windowAreaM2 defaults to 0: the volumetric BASE_W_PER_M3_PER_K already
 * approximates average fabric + infiltration loss for a moderate room, so
 * Simple = pure volumetric base; Detailed lets you ADD explicit window loss on
 * top for rooms with large glazing.
 */
export const SIMPLE_INSULATION: Insulation = 'orta';
export const SIMPLE_EXPOSURE: Exposure = 'normal';
export const SIMPLE_WINDOW_AREA_M2 = 0;

// ── Types ────────────────────────────────────────────────────────────────────
export interface HeatLossSimpleInput {
  mode: 'simple';
  areaM2: number;
  ceilingM: number;
  /** İç–dış sıcaklık farkı ΔT (K / °C). */
  deltaT: number;
}

export interface HeatLossDetailedInput {
  mode: 'detailed';
  areaM2: number;
  ceilingM: number;
  deltaT: number;
  insulation: Insulation;
  windowAreaM2: number;
  exposure: Exposure;
}

export type HeatLossInput = HeatLossSimpleInput | HeatLossDetailedInput;

export interface BreakdownItem {
  readonly label: string;
  readonly watts: number;
}

export interface HeatLossSuccess {
  readonly totalW: number;
  readonly kW: number;
  readonly kcalPerH: number;
  /** Power in kW / BTU·h / kcal·h. */
  readonly rows: readonly PowerRow[];
  /** Per-line-item contributions (sum to totalW). */
  readonly breakdown: readonly BreakdownItem[];
  readonly steps: readonly string[];
}

export type HeatLossResult = CalcResult<HeatLossSuccess>;

export const HEAT_LOSS_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_AREA: 'NON_POSITIVE_AREA',
  NON_POSITIVE_CEILING: 'NON_POSITIVE_CEILING',
  NON_POSITIVE_DELTA_T: 'NON_POSITIVE_DELTA_T',
  NEGATIVE_VALUE: 'NEGATIVE_VALUE',
  INVALID_ENUM: 'INVALID_ENUM',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

interface CoreParams {
  areaM2: number;
  ceilingM: number;
  deltaT: number;
  insulation: Insulation;
  windowAreaM2: number;
  exposure: Exposure;
}

/** Fill Simple inputs with the documented defaults so both modes share one core. */
function toCoreParams(input: HeatLossInput): CoreParams {
  if (input.mode === 'simple') {
    return {
      areaM2: input.areaM2,
      ceilingM: input.ceilingM,
      deltaT: input.deltaT,
      insulation: SIMPLE_INSULATION,
      windowAreaM2: SIMPLE_WINDOW_AREA_M2,
      exposure: SIMPLE_EXPOSURE,
    };
  }
  return {
    areaM2: input.areaM2,
    ceilingM: input.ceilingM,
    deltaT: input.deltaT,
    insulation: input.insulation,
    windowAreaM2: input.windowAreaM2,
    exposure: input.exposure,
  };
}

/**
 * Compute the estimated heating load (heat loss) in watts, kW and kcal/h. Pure
 * and total — returns a failure object (never throws) for invalid input.
 */
export function solveHeatLoss(input: HeatLossInput): HeatLossResult {
  const p = toCoreParams(input);

  if (!Number.isFinite(p.areaM2)) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.INVALID_NUMBER, 'Geçerli bir alan girin.');
  }
  if (p.areaM2 <= 0) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.NON_POSITIVE_AREA, "Alan 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(p.ceilingM)) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.INVALID_NUMBER, 'Geçerli bir tavan yüksekliği girin.');
  }
  if (p.ceilingM <= 0) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.NON_POSITIVE_CEILING, "Tavan yüksekliği 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(p.deltaT)) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.INVALID_NUMBER, 'Geçerli bir sıcaklık farkı girin.');
  }
  if (p.deltaT <= 0) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.NON_POSITIVE_DELTA_T, "Sıcaklık farkı 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(p.windowAreaM2) || p.windowAreaM2 < 0) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.NEGATIVE_VALUE, 'Pencere alanı negatif olamaz.');
  }
  if (!(p.insulation in INSULATION_FACTOR)) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.INVALID_ENUM, 'Geçersiz yalıtım seçimi.');
  }
  if (!(p.exposure in EXPOSURE_FACTOR)) {
    return fail<HeatLossSuccess>(HEAT_LOSS_ERROR.INVALID_ENUM, 'Geçersiz konum (cephe) seçimi.');
  }

  const volume = p.areaM2 * p.ceilingM;
  // referenceBase = the "orta / normal" volumetric loss before fabric factors.
  const referenceBase = volume * p.deltaT * BASE_W_PER_M3_PER_K;
  const insFactor = INSULATION_FACTOR[p.insulation];
  const expFactor = EXPOSURE_FACTOR[p.exposure];
  const base = referenceBase * insFactor * expFactor;
  const fabricAdjustment = base - referenceBase; // combined insulation × exposure correction
  const windowW = p.windowAreaM2 * p.deltaT * WINDOW_W_PER_M2_PER_K;
  const totalW = base + windowW;

  const kW = totalW / 1000;
  const kcalPerH = kW * KW_TO_KCAL_PER_H;

  if (![totalW, kW, kcalPerH].every(Number.isFinite) || totalW <= 0) {
    return fail<HeatLossSuccess>(
      HEAT_LOSS_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const breakdown: BreakdownItem[] = [
    { label: 'Taban ısı kaybı (orta yalıtım referansı)', watts: referenceBase },
    { label: 'Yalıtım & konum düzeltmesi', watts: fabricAdjustment },
    { label: 'Pencere ısı kaybı', watts: windowW },
  ];

  const steps: string[] = [
    `Hacim: ${fmt(p.areaM2)} × ${fmt(p.ceilingM)} = ${fmt(volume)} m³`,
    `Taban ısı kaybı: ${fmt(volume)} × ${fmt(p.deltaT)} × ${BASE_W_PER_M3_PER_K} = ${fmt(referenceBase)} W`,
    `Yalıtım & konum (×${fmt(insFactor)} × ${fmt(expFactor)}): ${fmt(referenceBase)} → ${fmt(base)} W`,
    ...(windowW > 0
      ? [`Pencere ısı kaybı: ${fmt(p.windowAreaM2)} × ${fmt(p.deltaT)} × ${WINDOW_W_PER_M2_PER_K} = ${fmt(windowW)} W`]
      : []),
    `Toplam ısıtma yükü: ${fmt(totalW)} W = ${fmt(kW)} kW = ${fmt(kcalPerH)} kcal/saat`,
  ];

  return {
    ok: true,
    totalW,
    kW,
    kcalPerH,
    rows: powerRows(kW, formatNumber),
    breakdown,
    steps,
  };
}

/** Registry metadata for the heat-loss (heating load) calculator. */
export const isiKaybiMeta: Calculator = {
  id: 'isi-kaybi',
  slug: 'isi-kaybi-hesaplama',
  categoryId: 'hvac',
  title: 'Isı Kaybı (Isıtma Yükü) Hesaplama',
  description:
    'Bir mekânın ısıtma yükünü (kW ve kcal/saat) hesaplayın; iç-dış sıcaklık farkına göre, basit veya detaylı mod. Sonuç ön tahmindir.',
  keywords: [
    'ısı kaybı hesaplama',
    'ısıtma yükü hesaplama',
    'kalorifer hesabı',
    'kcal hesaplama ısıtma',
    'bina ısı kaybı',
    'ısıtma kapasitesi',
  ],
  relatedTools: ['radyator-dilim', 'klima-btu', 'su-isitma-gucu'],
  faq: [
    {
      question: 'Isı kaybı nasıl hesaplanır?',
      answer:
        'Pratik bir tahmin için mekânın hacmi (alan × tavan yüksekliği), iç-dış sıcaklık farkı (ΔT) ve bir hacimsel ısı kaybı katsayısı çarpılır; buna yalıtım kalitesi ve dış cephe/köşe durumu için düzeltme katsayıları ile (detaylı modda) pencerelerden olan ek kayıp eklenir. Sonuç watt cinsinden bulunur, kW ve kcal/saate çevrilir. Bu yöntem tipik koşullar için bir ön tahmindir; kesin değer için TS 825 esaslı profesyonel bir ısı kaybı hesabı gerekir.',
    },
    {
      question: 'İç-dış sıcaklık farkı (ΔT) neden önemli?',
      answer:
        'Isıtma yükü, iç ve dış ortam arasındaki sıcaklık farkıyla (ΔT) doğru orantılıdır: fark iki katına çıkarsa kayıp da yaklaşık iki katına çıkar. Dış tasarım sıcaklığı şehre/iklime göre çok değiştiğinden (örneğin Antalya ile Erzurum arasında büyük fark vardır), ΔT bu hesapta kullanıcı tarafından girilir. İç sıcaklık genelde 20–22 °C alınır; dış tasarım sıcaklığı ise bölgenizin en soğuk koşullarına göre seçilir.',
    },
  ],
};
