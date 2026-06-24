/**
 * Motor full-load current calculator — pure logic.
 *
 * From shaft (output) power, efficiency and power factor, compute the full-load
 * line current, the input (drawn) power and the losses.
 *   P_in = P_out / (η/100)
 *   3φ: I = P_in·1000 / (√3·V·cosφ)     1φ: I = P_in·1000 / (V·cosφ)
 *   losses = P_in − P_out
 * For 3φ the voltage is line-to-line. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface MotorCurrentInput {
  /** 1 or 3 (phase count). */
  phase?: number;
  /** Shaft/output (mechanical) power P_out [kW]. */
  outputPowerKw?: number;
  /** Supply voltage V [V] (line-to-line for 3φ). */
  voltageV?: number;
  /** Efficiency η [%], in (0, 100]. */
  efficiencyPercent?: number;
  /** Power factor cosφ [–], in (0, 1]. */
  powerFactor?: number;
}

export interface MotorCurrentValues {
  /** Full-load line current I [A]. */
  readonly current: number;
  /** Drawn (input) power P_in [kW]. */
  readonly inputPowerKw: number;
  /** Losses P_in − P_out [kW]. */
  readonly lossesKw: number;
}

export interface MotorCurrentSuccess {
  readonly values: MotorCurrentValues;
  readonly steps: readonly string[];
}

export type MotorCurrentResult = CalcResult<MotorCurrentSuccess>;

export const MOTOR_CURRENT_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  EFFICIENCY_RANGE: 'EFFICIENCY_RANGE',
  POWER_FACTOR_RANGE: 'POWER_FACTOR_RANGE',
  INVALID_PHASE: 'INVALID_PHASE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const SQRT3 = Math.sqrt(3);

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Compute motor full-load current, input power and losses. Pure and total —
 * returns a failure object (never throws) for invalid input.
 */
export function solveMotorCurrent(input: MotorCurrentInput): MotorCurrentResult {
  if (input.phase !== 1 && input.phase !== 3) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.INVALID_PHASE,
      'Faz sayısı 1 veya 3 olmalıdır.',
    );
  }

  const positives: { key: 'outputPowerKw' | 'voltageV'; label: string }[] = [
    { key: 'outputPowerKw', label: 'Çıkış gücü (P)' },
    { key: 'voltageV', label: 'Gerilim (V)' },
  ];
  for (const { key, label } of positives) {
    const value = input[key];
    if (value === undefined) {
      return fail<MotorCurrentSuccess>(MOTOR_CURRENT_ERROR.MISSING_VALUE, `${label} girilmelidir.`);
    }
    if (!Number.isFinite(value)) {
      return fail<MotorCurrentSuccess>(
        MOTOR_CURRENT_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<MotorCurrentSuccess>(
        MOTOR_CURRENT_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const efficiency = input.efficiencyPercent;
  if (efficiency === undefined) {
    return fail<MotorCurrentSuccess>(MOTOR_CURRENT_ERROR.MISSING_VALUE, 'Verim (η) girilmelidir.');
  }
  if (!Number.isFinite(efficiency)) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.INVALID_NUMBER,
      'Verim (η) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (efficiency <= 0 || efficiency > 100) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.EFFICIENCY_RANGE,
      'Verim (η) 0 ile 100 arasında olmalıdır (0 < η ≤ 100).',
    );
  }

  const cosphi = input.powerFactor;
  if (cosphi === undefined) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.MISSING_VALUE,
      'Güç faktörü (cosφ) girilmelidir.',
    );
  }
  if (!Number.isFinite(cosphi)) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.INVALID_NUMBER,
      'Güç faktörü (cosφ) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (cosphi <= 0 || cosphi > 1) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.POWER_FACTOR_RANGE,
      'Güç faktörü (cosφ) 0 ile 1 arasında olmalıdır (0 < cosφ ≤ 1).',
    );
  }

  const phase: 1 | 3 = input.phase === 1 ? 1 : 3;
  const pOut = input.outputPowerKw!;
  const v = input.voltageV!;

  const inputPowerKw = pOut / (efficiency / 100);
  const current =
    (inputPowerKw * 1000) / (phase === 3 ? SQRT3 * v * cosphi : v * cosphi);
  const lossesKw = inputPowerKw - pOut;

  if (
    ![current, inputPowerKw, lossesKw].every(Number.isFinite) ||
    current <= 0 ||
    inputPowerKw <= 0 ||
    lossesKw < 0
  ) {
    return fail<MotorCurrentSuccess>(
      MOTOR_CURRENT_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const currentStep =
    phase === 3
      ? `Tam yük akımı: I = P_giriş × 1000 / (√3 × V × cosφ) = ${fmt(inputPowerKw * 1000)} / (${fmt(SQRT3)} × ${fmt(v)} × ${fmt(cosphi)}) = ${fmt(current)} A`
      : `Tam yük akımı: I = P_giriş × 1000 / (V × cosφ) = ${fmt(inputPowerKw * 1000)} / (${fmt(v)} × ${fmt(cosphi)}) = ${fmt(current)} A`;

  return {
    ok: true,
    values: { current, inputPowerKw, lossesKw },
    steps: [
      `Giriş gücü: P_giriş = P_çıkış / (η/100) = ${fmt(pOut)} / ${fmt(efficiency / 100)} = ${fmt(inputPowerKw)} kW`,
      currentStep,
      `Kayıplar: P_kayıp = P_giriş − P_çıkış = ${fmt(inputPowerKw)} − ${fmt(pOut)} = ${fmt(lossesKw)} kW (${fmt(lossesKw * 1000)} W)`,
    ],
  };
}

/** Registry metadata for the motor full-load current calculator. */
export const motorCurrentMeta: Calculator = {
  id: 'motor-akimi',
  slug: 'motor-akimi-hesaplayici',
  categoryId: 'electrical',
  title: 'Motor Tam Yük Akımı Hesaplayıcı',
  description:
    'Motor çıkış gücü, verim ve güç faktöründen tam yük akımını, çekilen gücü ve kayıpları hesaplayın (1 faz / 3 faz).',
  formula: 'I = P / (√3·V·cosφ·η) (3 faz)',
  keywords: [
    'motor akımı hesaplama',
    'motor amper hesaplama',
    'tam yük akımı',
    'motor verimi',
    'motor gücü akım',
  ],
  relatedTools: ['amper-hesabi', 'guc-hesabi', 'kablo-kesiti'],
  faq: [
    {
      question: 'Motor tam yük akımı nasıl hesaplanır?',
      answer:
        'Önce motorun şebekeden çektiği giriş gücü bulunur: P_giriş = P_çıkış / verim. Sonra üç fazda I = P_giriş / (√3 × V × cosφ), tek fazda I = P_giriş / (V × cosφ) ile akım hesaplanır (güçler watt’a çevrilerek). Etiket (anma) akımı bu değere yakındır.',
    },
    {
      question: 'Motor verimi akımı nasıl etkiler?',
      answer:
        'Çıkış gücü sabitken verim düştükçe motorun çektiği giriş gücü artar (P_giriş = P_çıkış / verim), dolayısıyla çekilen akım da artar. Aradaki fark kayıplara (ısı) dönüşür: P_kayıp = P_giriş − P_çıkış.',
    },
  ],
};
