/**
 * Line-current calculator — pure logic.
 *
 * From power (kW or kVA), supply voltage and (for kW) power factor, compute the
 * line current for 1-phase or 3-phase systems.
 *   Apparent power S: kVA → S = value·1000 ; kW → S = value·1000 / cosφ   (VA)
 *   1φ: I = S / V        3φ: I = S / (√3·V)
 * For 3φ the voltage is line-to-line. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export type PowerType = 'kW' | 'kVA';

export interface CurrentInput {
  /** Whether `power` is given as kW (real) or kVA (apparent). */
  powerType?: PowerType;
  /** Power value, in the unit selected by `powerType`. */
  power?: number;
  /** Supply voltage V [V] (line-to-line for 3φ). */
  voltage?: number;
  /** Power factor cosφ [–], in (0, 1]. Required ONLY when powerType is "kW". */
  powerFactor?: number;
  /** 1 or 3 (phase count). */
  phase?: number;
}

export interface CurrentValues {
  /** Line current I [A]. */
  readonly current: number;
  /** Apparent power S [kVA]. */
  readonly apparentPower: number;
  /** Active power P [kW] — only present on the kW path. */
  readonly activePower?: number;
}

export interface CurrentSuccess {
  readonly values: CurrentValues;
  readonly steps: readonly string[];
}

export type CurrentResult = CalcResult<CurrentSuccess>;

export const CURRENT_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  POWER_FACTOR_RANGE: 'POWER_FACTOR_RANGE',
  INVALID_PHASE: 'INVALID_PHASE',
  INVALID_POWER_TYPE: 'INVALID_POWER_TYPE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const SQRT3 = Math.sqrt(3);

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Compute the line current from power, voltage, (cosφ for kW) and phase. Pure
 * and total — returns a failure object (never throws) for invalid input.
 */
export function solveCurrent(input: CurrentInput): CurrentResult {
  if (input.phase !== 1 && input.phase !== 3) {
    return fail<CurrentSuccess>(
      CURRENT_ERROR.INVALID_PHASE,
      'Faz sayısı 1 veya 3 olmalıdır.',
    );
  }
  if (input.powerType !== 'kW' && input.powerType !== 'kVA') {
    return fail<CurrentSuccess>(
      CURRENT_ERROR.INVALID_POWER_TYPE,
      'Güç türü kW veya kVA olmalıdır.',
    );
  }

  const required: { key: 'power' | 'voltage'; label: string }[] = [
    { key: 'power', label: 'Güç' },
    { key: 'voltage', label: 'Gerilim (V)' },
  ];
  for (const { key, label } of required) {
    const value = input[key];
    if (value === undefined) {
      return fail<CurrentSuccess>(CURRENT_ERROR.MISSING_VALUE, `${label} girilmelidir.`);
    }
    if (!Number.isFinite(value)) {
      return fail<CurrentSuccess>(
        CURRENT_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<CurrentSuccess>(
        CURRENT_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const phase = input.phase;
  const power = input.power!;
  const v = input.voltage!;

  // cosφ is only needed (and validated) on the kW path.
  let cosphi: number | undefined;
  if (input.powerType === 'kW') {
    const value = input.powerFactor;
    if (value === undefined) {
      return fail<CurrentSuccess>(
        CURRENT_ERROR.MISSING_VALUE,
        'kW girişinde güç faktörü (cosφ) girilmelidir.',
      );
    }
    if (!Number.isFinite(value)) {
      return fail<CurrentSuccess>(
        CURRENT_ERROR.INVALID_NUMBER,
        'Güç faktörü (cosφ) geçerli, sonlu bir sayı olmalıdır.',
      );
    }
    if (value <= 0 || value > 1) {
      return fail<CurrentSuccess>(
        CURRENT_ERROR.POWER_FACTOR_RANGE,
        'Güç faktörü (cosφ) 0 ile 1 arasında olmalıdır (0 < cosφ ≤ 1).',
      );
    }
    cosphi = value;
  }

  // Apparent power S in kVA.
  const apparentPower = cosphi === undefined ? power : power / cosphi;
  const activePower = cosphi === undefined ? undefined : power;
  // Line current I [A] = (S_kVA · 1000) / (√3·V) for 3φ, / V for 1φ.
  const current =
    (apparentPower * 1000) / (phase === 3 ? SQRT3 * v : v);

  const outputs = [current, apparentPower];
  if (activePower !== undefined) outputs.push(activePower);
  if (!outputs.every(Number.isFinite) || outputs.some((value) => value <= 0)) {
    return fail<CurrentSuccess>(
      CURRENT_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const steps: string[] = [];
  if (cosphi === undefined) {
    steps.push(`Görünür güç: S = ${fmt(apparentPower)} kVA (girilen)`);
  } else {
    steps.push(
      `Görünür güç: S = P / cosφ = ${fmt(power)} / ${fmt(cosphi)} = ${fmt(apparentPower)} kVA`,
    );
  }
  steps.push(
    phase === 3
      ? `Hat akımı: I = S × 1000 / (√3 × V) = ${fmt(apparentPower)} × 1000 / (${fmt(SQRT3)} × ${fmt(v)}) = ${fmt(current)} A`
      : `Hat akımı: I = S × 1000 / V = ${fmt(apparentPower)} × 1000 / ${fmt(v)} = ${fmt(current)} A`,
  );

  return {
    ok: true,
    values: { current, apparentPower, activePower },
    steps,
  };
}

/** Registry metadata for the line-current calculator. */
export const currentMeta: Calculator = {
  id: 'amper-hesabi',
  slug: 'amper-hesaplayici',
  categoryId: 'electrical',
  title: 'Akım (Amper) Hesaplayıcı',
  description:
    'Güç (kW veya kVA), gerilim ve güç faktöründen hat akımını hesaplayın (1 faz / 3 faz).',
  formula: 'I = P / (√3·V·cosφ) (3 faz)',
  keywords: [
    'amper hesaplama',
    'kVA amper',
    'kW amper',
    'akım hesaplama',
    'üç faz akım',
  ],
  relatedTools: ['guc-hesabi', 'kablo-kesiti', 'guc-ucgeni'],
  faq: [
    {
      question: "kVA'dan amper nasıl hesaplanır?",
      answer:
        'Görünür güç doğrudan akıma dönüşür: tek fazda I = S / V, üç fazda I = S / (√3 × V). S’yi VA cinsinden (kVA × 1000) kullanın; güç faktörüne gerek yoktur çünkü kVA zaten görünür güçtür.',
    },
    {
      question: "kW'tan amper hesabında güç faktörü neden gerekir?",
      answer:
        'kW aktif güçtür; akımı belirleyen ise görünür güçtür (S = P / cosφ). Bu yüzden kW’tan akım hesaplarken önce cosφ ile görünür güce çevirmek gerekir: cosφ düştükçe aynı kW için çekilen akım artar.',
    },
  ],
};
