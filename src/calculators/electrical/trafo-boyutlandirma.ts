/**
 * Transformer (kVA) sizing calculator — pure logic.
 *
 * Apparent-power sizing is phase-independent (no phase input).
 *   S_load = P / cosφ                       [kVA]
 *   required = S_load · (1 + margin/100)    [kVA]
 *   recommended = smallest standard rating ≥ required
 * If `required` exceeds the largest standard rating, it still SUCCEEDS with
 * recommendedStandardKva = null and a note (parallel/custom sizing needed).
 * No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** Common IEC distribution-transformer power ratings [kVA]. */
export const STANDARD_TRANSFORMER_KVA = [
  25, 50, 100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500,
] as const;

export interface TransformerSizingInput {
  /** Load power P [kW]. */
  loadPowerKw?: number;
  /** Power factor cosφ [–], in (0, 1]. */
  powerFactor?: number;
  /** Safety/growth margin [%], in [0, 1000]. Typical 25. */
  marginPercent?: number;
}

export interface TransformerSizingValues {
  /** Load apparent power S_load = P / cosφ [kVA] (before margin). */
  readonly loadApparentKva: number;
  /** Required apparent power after margin [kVA]. */
  readonly requiredKva: number;
  /** Smallest standard rating ≥ required [kVA], or null if above the largest. */
  readonly recommendedStandardKva: number | null;
}

export interface TransformerSizingSuccess {
  readonly values: TransformerSizingValues;
  readonly steps: readonly string[];
}

export type TransformerSizingResult = CalcResult<TransformerSizingSuccess>;

export const TRANSFORMER_SIZING_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  POWER_FACTOR_RANGE: 'POWER_FACTOR_RANGE',
  MARGIN_RANGE: 'MARGIN_RANGE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Size a transformer from load power, power factor and margin. Pure and total —
 * returns a failure object (never throws) for invalid input. Over-range is a
 * success (recommendedStandardKva = null), not a failure.
 */
export function solveTransformerSizing(
  input: TransformerSizingInput,
): TransformerSizingResult {
  const p = input.loadPowerKw;
  if (p === undefined) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.MISSING_VALUE,
      'Yük gücü (P) girilmelidir.',
    );
  }
  if (!Number.isFinite(p)) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.INVALID_NUMBER,
      'Yük gücü (P) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (p <= 0) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.NON_POSITIVE_VALUE,
      'Yük gücü (P) sıfırdan büyük olmalıdır.',
    );
  }

  const cosphi = input.powerFactor;
  if (cosphi === undefined) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.MISSING_VALUE,
      'Güç faktörü (cosφ) girilmelidir.',
    );
  }
  if (!Number.isFinite(cosphi)) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.INVALID_NUMBER,
      'Güç faktörü (cosφ) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (cosphi <= 0 || cosphi > 1) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.POWER_FACTOR_RANGE,
      'Güç faktörü (cosφ) 0 ile 1 arasında olmalıdır (0 < cosφ ≤ 1).',
    );
  }

  const margin = input.marginPercent;
  if (margin === undefined) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.MISSING_VALUE,
      'Emniyet payı (%) girilmelidir.',
    );
  }
  if (!Number.isFinite(margin)) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.INVALID_NUMBER,
      'Emniyet payı (%) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (margin < 0 || margin > 1000) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.MARGIN_RANGE,
      'Emniyet payı 0 ile 1000 arasında olmalıdır.',
    );
  }

  const loadApparentKva = p / cosphi;
  const requiredKva = loadApparentKva * (1 + margin / 100);

  if (
    !Number.isFinite(loadApparentKva) ||
    !Number.isFinite(requiredKva) ||
    loadApparentKva <= 0 ||
    requiredKva <= 0
  ) {
    return fail<TransformerSizingSuccess>(
      TRANSFORMER_SIZING_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const recommendedStandardKva =
    STANDARD_TRANSFORMER_KVA.find((rating) => rating >= requiredKva) ?? null;
  const largest = STANDARD_TRANSFORMER_KVA[STANDARD_TRANSFORMER_KVA.length - 1];

  const steps: string[] = [
    `Yük gücü: S_yük = P / cosφ = ${fmt(p)} / ${fmt(cosphi)} = ${fmt(loadApparentKva)} kVA`,
    `Emniyet payı: gereken = S_yük × (1 + %${fmt(margin)}) = ${fmt(loadApparentKva)} × ${fmt(1 + margin / 100)} = ${fmt(requiredKva)} kVA`,
    recommendedStandardKva !== null
      ? `Standart kademe: gereken değere eşit/büyük ilk standart kademe → ${fmt(recommendedStandardKva)} kVA`
      : `Standart kademe: gereken (${fmt(requiredKva)} kVA) kapsanan en büyük kademeyi (${fmt(largest)} kVA) aşıyor; paralel trafo / özel boyutlandırma gerekir.`,
  ];

  return {
    ok: true,
    values: { loadApparentKva, requiredKva, recommendedStandardKva },
    steps,
  };
}

/** Registry metadata for the transformer sizing calculator. */
export const transformerSizingMeta: Calculator = {
  id: 'trafo-boyutlandirma',
  slug: 'trafo-boyutlandirma-hesaplayici',
  categoryId: 'electrical',
  title: 'Trafo (kVA) Boyutlandırma Hesaplayıcı',
  description:
    'Yük gücü, güç faktörü ve emniyet payına göre gereken transformatör gücünü (kVA) ve bir üst standart kademeyi hesaplayın.',
  formula: 'S = P / cosφ · (1 + pay)',
  keywords: [
    'trafo boyutlandırma',
    'transformatör kVA hesaplama',
    'trafo gücü hesaplama',
    'kVA hesaplama',
    'trafo seçimi',
  ],
  relatedTools: ['guc-hesabi', 'kisa-devre-akimi', 'kompanzasyon'],
  faq: [
    {
      question: 'Transformatör gücü nasıl seçilir?',
      answer:
        'Önce yükün görünür gücü hesaplanır: S = P / cosφ (kVA). Buna ileriye dönük büyüme ve emniyet için bir pay eklenir. Çıkan değere eşit veya ondan büyük en küçük standart trafo kademesi (ör. 250, 400, 630 kVA…) seçilir.',
    },
    {
      question: 'Emniyet payı neden bırakılır?',
      answer:
        'Trafonun sürekli tam yükte çalışmaması, ileride yük artışını karşılayabilmesi ve verim/ömür açısından rahat bir çalışma noktası için kapasite payı bırakılır. Uygulamada %20–%30 yaygındır; çok büyük pay ise gereksiz yatırım ve düşük yükte verim kaybı demektir.',
    },
  ],
};
