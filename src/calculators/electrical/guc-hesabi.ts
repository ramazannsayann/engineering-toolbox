/**
 * Power calculator — pure logic.
 *
 * From supply voltage, line current and power factor, compute active (P),
 * reactive (Q) and apparent (S) power for 1-phase or 3-phase systems.
 *   1φ: S = V·I        3φ: S = √3·V·I   (VA)
 *   P = S·cosφ         Q = √(S² − P²)
 * Outputs returned in kW / kvar / kVA. For 3φ the voltage is line-to-line.
 * No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface PowerInput {
  /** 1 or 3 (phase count). */
  phase?: number;
  /** Supply voltage V [V] (line-to-line for 3φ). */
  voltage?: number;
  /** Line current I [A]. */
  current?: number;
  /** Power factor cosφ [–], in (0, 1]. */
  powerFactor?: number;
}

export interface PowerValues {
  /** Active power P [kW]. */
  readonly activePower: number;
  /** Reactive power Q [kvar]. */
  readonly reactivePower: number;
  /** Apparent power S [kVA]. */
  readonly apparentPower: number;
}

export interface PowerSuccess {
  readonly values: PowerValues;
  readonly steps: readonly string[];
}

export type PowerResult = CalcResult<PowerSuccess>;

export const POWER_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  POWER_FACTOR_RANGE: 'POWER_FACTOR_RANGE',
  INVALID_PHASE: 'INVALID_PHASE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const SQRT3 = Math.sqrt(3);

/** Round to 6 significant figures and drop trailing zeros for readable steps. */
function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Compute P/Q/S from V, I, cosφ and phase. Pure and total — returns a failure
 * object (never throws) for invalid input or out-of-range result.
 */
export function solvePower(input: PowerInput): PowerResult {
  if (input.phase !== 1 && input.phase !== 3) {
    return fail<PowerSuccess>(
      POWER_ERROR.INVALID_PHASE,
      'Faz sayısı 1 veya 3 olmalıdır.',
    );
  }

  const numerics: { key: 'voltage' | 'current' | 'powerFactor'; label: string }[] = [
    { key: 'voltage', label: 'Gerilim (V)' },
    { key: 'current', label: 'Akım (I)' },
    { key: 'powerFactor', label: 'Güç faktörü (cosφ)' },
  ];

  for (const { key, label } of numerics) {
    const value = input[key];
    if (value === undefined) {
      return fail<PowerSuccess>(POWER_ERROR.MISSING_VALUE, `${label} girilmelidir.`);
    }
    if (!Number.isFinite(value)) {
      return fail<PowerSuccess>(
        POWER_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (key === 'powerFactor') {
      if (value <= 0 || value > 1) {
        return fail<PowerSuccess>(
          POWER_ERROR.POWER_FACTOR_RANGE,
          'Güç faktörü (cosφ) 0 ile 1 arasında olmalıdır (0 < cosφ ≤ 1).',
        );
      }
    } else if (value <= 0) {
      return fail<PowerSuccess>(
        POWER_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const phase = input.phase;
  const v = input.voltage!;
  const i = input.current!;
  const cosphi = input.powerFactor!;

  // Apparent power in kVA; P in kW; Q in kvar.
  const apparentPower = (phase === 3 ? SQRT3 * v * i : v * i) / 1000;
  const activePower = apparentPower * cosphi;
  const reactivePower = Math.sqrt(
    Math.max(0, apparentPower * apparentPower - activePower * activePower),
  );

  const allFinite = [apparentPower, activePower, reactivePower].every(Number.isFinite);
  if (!allFinite || apparentPower <= 0 || activePower <= 0 || reactivePower < 0) {
    return fail<PowerSuccess>(
      POWER_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const apparentStep =
    phase === 3
      ? `Görünür güç: S = √3 × V × I / 1000 = ${fmt(SQRT3)} × ${fmt(v)} × ${fmt(i)} / 1000 = ${fmt(apparentPower)} kVA`
      : `Görünür güç: S = V × I / 1000 = ${fmt(v)} × ${fmt(i)} / 1000 = ${fmt(apparentPower)} kVA`;

  return {
    ok: true,
    values: { activePower, reactivePower, apparentPower },
    steps: [
      apparentStep,
      `Aktif güç: P = S × cosφ = ${fmt(apparentPower)} × ${fmt(cosphi)} = ${fmt(activePower)} kW`,
      `Reaktif güç: Q = √(S² − P²) = √(${fmt(apparentPower)}² − ${fmt(activePower)}²) = ${fmt(reactivePower)} kvar`,
    ],
  };
}

/** Registry metadata for the power calculator. */
export const powerMeta: Calculator = {
  id: 'guc-hesabi',
  slug: 'guc-hesaplayici',
  categoryId: 'electrical',
  title: 'Güç Hesaplayıcı',
  description:
    'Gerilim, akım ve güç faktöründen aktif, reaktif ve görünür gücü hesaplayın (1 faz / 3 faz).',
  formula: 'P = √3·V·I·cosφ (3 faz)',
  keywords: [
    'güç hesaplama',
    'üç faz güç',
    'aktif güç hesaplama',
    'kW hesaplama',
    'V I cosφ güç',
  ],
  relatedTools: ['guc-ucgeni', 'amper-hesabi', 'kompanzasyon', 'ohms-law'],
  faq: [
    {
      question: 'Tek faz ve üç faz güç hesabı nasıl farklıdır?',
      answer:
        'Tek fazda görünür güç S = V × I’dir. Üç fazda hat-hat gerilim kullanılır ve S = √3 × V × I olur. Her iki durumda da aktif güç P = S × cosφ, reaktif güç Q = √(S² − P²) ile bulunur.',
    },
    {
      question: 'Güç faktörü (cosφ) gücü nasıl etkiler?',
      answer:
        'Aktif güç P = S × cosφ olduğundan, aynı gerilim ve akımda cosφ düştükçe işe dönüşen aktif güç azalır ve reaktif güç artar. cosφ = 1 iken tüm görünür güç aktif güce dönüşür (Q = 0).',
    },
  ],
};
