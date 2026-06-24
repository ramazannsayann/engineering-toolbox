/**
 * Power-factor compensation calculator — pure logic.
 *
 * Capacitor (reactive) power needed to raise the power factor from cosφ₁ to a
 * higher target cosφ₂ for an active load P [kW]:
 *   Qc = P · (tanφ₁ − tanφ₂)   [kvar],   where tanφ = √(1 − cos²φ) / cosφ
 * Also reports apparent power before/after (S = P / cosφ). No React/Astro/DOM.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface CompensationInput {
  /** Active power P [kW]. */
  activePower?: number;
  /** Current power factor cosφ₁ [–], in (0, 1]. */
  currentPowerFactor?: number;
  /** Target power factor cosφ₂ [–], in (0, 1] and greater than cosφ₁. */
  targetPowerFactor?: number;
}

export interface CompensationValues {
  /** Required compensation (capacitor) power Qc [kvar]. */
  readonly requiredKvar: number;
  /** Apparent power before compensation S₁ [kVA]. */
  readonly apparentBefore: number;
  /** Apparent power after compensation S₂ [kVA]. */
  readonly apparentAfter: number;
}

export interface CompensationSuccess {
  readonly values: CompensationValues;
  readonly steps: readonly string[];
}

export type CompensationResult = CalcResult<CompensationSuccess>;

export const COMPENSATION_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  POWER_FACTOR_RANGE: 'POWER_FACTOR_RANGE',
  /** Target power factor must be greater than the current one. */
  TARGET_NOT_GREATER: 'TARGET_NOT_GREATER',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/** tanφ from cosφ, avoiding an arccos/tan round-trip: tanφ = √(1 − cos²φ) / cosφ. */
function tanFromCos(cosphi: number): number {
  return Math.sqrt(Math.max(0, 1 - cosphi * cosphi)) / cosphi;
}

/**
 * Compute the required compensation kvar to move from cosφ₁ to cosφ₂. Pure and
 * total — returns a failure object (never throws) for invalid input.
 */
export function solveCompensation(input: CompensationInput): CompensationResult {
  const fields: {
    key: 'activePower' | 'currentPowerFactor' | 'targetPowerFactor';
    label: string;
    isPowerFactor: boolean;
  }[] = [
    { key: 'activePower', label: 'Aktif güç (P)', isPowerFactor: false },
    { key: 'currentPowerFactor', label: 'Mevcut güç faktörü (cosφ₁)', isPowerFactor: true },
    { key: 'targetPowerFactor', label: 'Hedef güç faktörü (cosφ₂)', isPowerFactor: true },
  ];

  for (const { key, label, isPowerFactor } of fields) {
    const value = input[key];
    if (value === undefined) {
      return fail<CompensationSuccess>(
        COMPENSATION_ERROR.MISSING_VALUE,
        `${label} girilmelidir.`,
      );
    }
    if (!Number.isFinite(value)) {
      return fail<CompensationSuccess>(
        COMPENSATION_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (isPowerFactor) {
      if (value <= 0 || value > 1) {
        return fail<CompensationSuccess>(
          COMPENSATION_ERROR.POWER_FACTOR_RANGE,
          `${label} 0 ile 1 arasında olmalıdır (0 < cosφ ≤ 1).`,
        );
      }
    } else if (value <= 0) {
      return fail<CompensationSuccess>(
        COMPENSATION_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const p = input.activePower!;
  const cos1 = input.currentPowerFactor!;
  const cos2 = input.targetPowerFactor!;

  if (cos2 <= cos1) {
    return fail<CompensationSuccess>(
      COMPENSATION_ERROR.TARGET_NOT_GREATER,
      'Hedef güç faktörü (cosφ₂), mevcut güç faktöründen (cosφ₁) büyük olmalıdır.',
    );
  }

  const tan1 = tanFromCos(cos1);
  const tan2 = tanFromCos(cos2);
  const requiredKvar = p * (tan1 - tan2);
  const apparentBefore = p / cos1;
  const apparentAfter = p / cos2;

  const outputs = [requiredKvar, apparentBefore, apparentAfter];
  if (!outputs.every(Number.isFinite) || outputs.some((value) => value <= 0)) {
    return fail<CompensationSuccess>(
      COMPENSATION_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  return {
    ok: true,
    values: { requiredKvar, apparentBefore, apparentAfter },
    steps: [
      `Mevcut görünür güç: S₁ = P / cosφ₁ = ${fmt(p)} / ${fmt(cos1)} = ${fmt(apparentBefore)} kVA`,
      `Hedef görünür güç: S₂ = P / cosφ₂ = ${fmt(p)} / ${fmt(cos2)} = ${fmt(apparentAfter)} kVA`,
      `Gerekli kompanzasyon: Qc = P × (tanφ₁ − tanφ₂) = ${fmt(p)} × (${fmt(tan1)} − ${fmt(tan2)}) = ${fmt(requiredKvar)} kvar`,
    ],
  };
}

/** Registry metadata for the compensation calculator. */
export const compensationMeta: Calculator = {
  id: 'kompanzasyon',
  slug: 'kompanzasyon-hesaplayici',
  categoryId: 'electrical',
  title: 'Kompanzasyon (kVAR) Hesaplayıcı',
  description:
    'Mevcut ve hedef güç faktörüne göre gereken kompanzasyon (kondansatör) gücünü hesaplayın.',
  formula: 'Qc = P·(tanφ₁ − tanφ₂)',
  keywords: [
    'kompanzasyon hesaplama',
    'kvar hesaplama',
    'güç faktörü düzeltme',
    'kondansatör gücü',
    'reaktif güç',
  ],
  relatedTools: ['guc-ucgeni', 'guc-hesabi'],
  faq: [
    {
      question: 'Kompanzasyon nedir, neden yapılır?',
      answer:
        'Kompanzasyon, endüktif yüklerin çektiği reaktif gücü kondansatörlerle yerinde karşılayarak güç faktörünü yükseltme işlemidir. Böylece şebekeden çekilen görünür güç (kVA) ve akım azalır, hat kayıpları düşer ve düşük güç faktörü cezasından kaçınılır.',
    },
    {
      question: 'Hedef güç faktörü kaç seçilmeli?',
      answer:
        'Uygulamada hedef genellikle 0,95–0,99 arasında seçilir; birçok şebekede 0,95 ve üzeri ceza sınırının dışında kalır. 1’e tam eşitlemek aşırı kompanzasyon (kapasitif) riski taşıdığından genelde tercih edilmez.',
    },
  ],
};
