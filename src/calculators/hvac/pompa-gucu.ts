/**
 * Pump power calculator (Pompa Gücü) — pure logic. Hydraulic power
 * P = ρ·g·Q·H, then shaft power = hydraulic / efficiency. This is MECHANICAL
 * power, so it is reported only in kW and HP (mechanical horsepower) — NOT in
 * thermal units (BTU/kcal), which are meaningless for pump shaft power. No
 * React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';

/** Water density, kg/m³. */
const RHO = 1000;
/** Gravitational acceleration, m/s². */
const G = 9.81;
/** 1 kW = 1.34102 HP (mechanical horsepower). */
const KW_TO_HP = 1.34102;

export interface PumpPowerInput {
  /** Flow rate in m³/hour. */
  flowM3h: number;
  /** Pump head (lift) in meters. */
  headM: number;
  /** Pump efficiency in percent, (0, 100]. */
  efficiencyPct: number;
}

export interface PumpPowerSuccess {
  /** Required shaft power in kW. */
  readonly shaftKW: number;
  /** Hydraulic (useful) power in kW. */
  readonly hydraulicKW: number;
  /** Required shaft power in HP. */
  readonly shaftHP: number;
  readonly steps: readonly string[];
}

export type PumpPowerResult = CalcResult<PumpPowerSuccess>;

export const PUMP_POWER_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_FLOW: 'NON_POSITIVE_FLOW',
  NON_POSITIVE_HEAD: 'NON_POSITIVE_HEAD',
  EFFICIENCY_RANGE: 'EFFICIENCY_RANGE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the required pump shaft power (kW, HP) and the hydraulic power. Pure
 * and total — returns a failure object (never throws) for invalid input.
 */
export function solvePumpPower(input: PumpPowerInput): PumpPowerResult {
  const { flowM3h, headM, efficiencyPct } = input;

  if (!Number.isFinite(flowM3h)) {
    return fail<PumpPowerSuccess>(PUMP_POWER_ERROR.INVALID_NUMBER, 'Geçerli bir debi girin.');
  }
  if (flowM3h <= 0) {
    return fail<PumpPowerSuccess>(PUMP_POWER_ERROR.NON_POSITIVE_FLOW, "Debi 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(headM)) {
    return fail<PumpPowerSuccess>(PUMP_POWER_ERROR.INVALID_NUMBER, 'Geçerli bir basma yüksekliği girin.');
  }
  if (headM <= 0) {
    return fail<PumpPowerSuccess>(PUMP_POWER_ERROR.NON_POSITIVE_HEAD, "Basma yüksekliği 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(efficiencyPct)) {
    return fail<PumpPowerSuccess>(PUMP_POWER_ERROR.INVALID_NUMBER, 'Geçerli bir verim girin.');
  }
  if (efficiencyPct <= 0 || efficiencyPct > 100) {
    return fail<PumpPowerSuccess>(
      PUMP_POWER_ERROR.EFFICIENCY_RANGE,
      'Verim 0 ile 100 arasında olmalıdır (0 < η ≤ 100).',
    );
  }

  const qSi = flowM3h / 3600; // m³/s
  const hydraulicW = RHO * G * qSi * headM;
  const shaftW = hydraulicW / (efficiencyPct / 100);
  const hydraulicKW = hydraulicW / 1000;
  const shaftKW = shaftW / 1000;
  const shaftHP = shaftKW * KW_TO_HP;

  if (![hydraulicKW, shaftKW, shaftHP].every(Number.isFinite) || shaftKW <= 0) {
    return fail<PumpPowerSuccess>(
      PUMP_POWER_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  return {
    ok: true,
    shaftKW,
    hydraulicKW,
    shaftHP,
    steps: [
      `Hidrolik güç: P = ρ × g × Q × H = 1000 × 9.81 × ${fmt(qSi)} × ${fmt(headM)} = ${fmt(hydraulicW)} W = ${fmt(hydraulicKW)} kW`,
      `Mil gücü: P_mil = P_hidrolik / (η/100) = ${fmt(hydraulicKW)} / ${fmt(efficiencyPct / 100)} = ${fmt(shaftKW)} kW`,
      `Beygir gücü: ${fmt(shaftKW)} × 1.34102 = ${fmt(shaftHP)} HP`,
    ],
  };
}

/** Registry metadata for the pump power calculator. */
export const pompaGucuMeta: Calculator = {
  id: 'pompa-gucu',
  slug: 'pompa-gucu-hesaplayici',
  categoryId: 'hvac',
  title: 'Pompa Gücü Hesaplayıcı',
  description:
    'Debi, basma yüksekliği ve verimden gereken pompa milini (kW ve HP) hesaplayın.',
  keywords: [
    'pompa gücü hesaplama',
    'pompa kW hesaplama',
    'pompa beygir hesabı',
    'su pompası gücü',
    'pompa motor gücü',
    'hidrolik güç',
  ],
  relatedTools: ['su-debisi', 'boru-capi', 'su-isitma-gucu'],
  faq: [
    {
      question: 'Pompa gücü nasıl hesaplanır?',
      answer:
        'Önce hidrolik (faydalı) güç hesaplanır: P = ρ × g × Q × H. Burada ρ suyun yoğunluğu (1000 kg/m³), g yerçekimi ivmesi (9,81 m/s²), Q debi (m³/s), H basma yüksekliğidir (m). Gereken mil gücü ise bu değerin pompa verimine bölünmesiyle bulunur: P_mil = P_hidrolik / verim.',
    },
    {
      question: 'Pompa verimi gücü nasıl etkiler?',
      answer:
        'Pompa verimi, mile verilen gücün ne kadarının suya aktarıldığını gösterir. Verim düştükçe aynı hidrolik iş için daha fazla mil gücü gerekir (P_mil = P_hidrolik / verim); aradaki fark ısı ve sürtünme olarak kaybolur. Örneğin %70 verimli bir pompa, hidrolik gücün yaklaşık 1,43 katı mil gücü ister.',
    },
  ],
};
