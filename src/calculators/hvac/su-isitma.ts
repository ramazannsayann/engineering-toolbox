/**
 * Water heating power / energy calculator (Su Isıtma) — pure logic.
 *
 * Physics: Q = m·c·ΔT. Water: c = 4186 J/(kg·°C); density ρ ≈ 1 kg/L (so mass in
 * kg ≈ volume in L). From the energy and a target time it derives the average
 * power needed ("what capacity heater do I need?"). No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { formatNumber } from '../general/linear-convert';
import { powerRows, type PowerRow } from './power-units';

/** Specific heat of water, J/(kg·°C). */
const WATER_SPECIFIC_HEAT = 4186;
/** Water density, kg/L (approx). */
const WATER_DENSITY = 1;

export interface WaterHeatingInput {
  /** Volume of water in liters. */
  volumeL: number;
  /** Temperature rise ΔT in °C. */
  deltaT: number;
  /** Heating time in minutes (for the average-power scenario). */
  minutes: number;
}

export interface WaterHeatingSuccess {
  readonly energyKWh: number;
  readonly energyKJ: number;
  readonly powerKW: number;
  /** Power in kW / BTU·h / kcal·h (copyable rows). */
  readonly powerRows: readonly PowerRow[];
  readonly steps: readonly string[];
}

export type WaterHeatingResult = CalcResult<WaterHeatingSuccess>;

export const WATER_HEATING_ERROR = {
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VOLUME: 'NON_POSITIVE_VOLUME',
  NON_POSITIVE_DELTA: 'NON_POSITIVE_DELTA',
  NON_POSITIVE_TIME: 'NON_POSITIVE_TIME',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const fmt = formatNumber;

/**
 * Compute the heating energy and the average power required. Pure and total —
 * returns a failure object (never throws) for invalid input.
 */
export function solveWaterHeating(input: WaterHeatingInput): WaterHeatingResult {
  const { volumeL, deltaT, minutes } = input;

  if (!Number.isFinite(volumeL)) {
    return fail<WaterHeatingSuccess>(WATER_HEATING_ERROR.INVALID_NUMBER, 'Geçerli bir hacim girin.');
  }
  if (volumeL <= 0) {
    return fail<WaterHeatingSuccess>(WATER_HEATING_ERROR.NON_POSITIVE_VOLUME, "Hacim 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(deltaT)) {
    return fail<WaterHeatingSuccess>(WATER_HEATING_ERROR.INVALID_NUMBER, 'Geçerli bir sıcaklık farkı girin.');
  }
  if (deltaT <= 0) {
    return fail<WaterHeatingSuccess>(WATER_HEATING_ERROR.NON_POSITIVE_DELTA, "Sıcaklık farkı 0'dan büyük olmalı.");
  }
  if (!Number.isFinite(minutes)) {
    return fail<WaterHeatingSuccess>(WATER_HEATING_ERROR.INVALID_NUMBER, 'Geçerli bir süre girin.');
  }
  if (minutes <= 0) {
    return fail<WaterHeatingSuccess>(WATER_HEATING_ERROR.NON_POSITIVE_TIME, "Süre 0'dan büyük olmalı.");
  }

  const mass = volumeL * WATER_DENSITY;
  const energyJoules = mass * WATER_SPECIFIC_HEAT * deltaT;
  const energyKWh = energyJoules / 3_600_000;
  const energyKJ = energyJoules / 1000;
  const powerW = energyJoules / (minutes * 60);
  const powerKW = powerW / 1000;

  if (
    ![energyKWh, energyKJ, powerKW].every(Number.isFinite) ||
    energyKWh <= 0 ||
    powerKW <= 0
  ) {
    return fail<WaterHeatingSuccess>(
      WATER_HEATING_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  return {
    ok: true,
    energyKWh,
    energyKJ,
    powerKW,
    powerRows: powerRows(powerKW, formatNumber),
    steps: [
      `Enerji: Q = m × c × ΔT = ${fmt(mass)} × 4186 × ${fmt(deltaT)} = ${fmt(energyJoules)} J`,
      `Enerji (kWh): Q / 3600000 = ${fmt(energyKWh)} kWh`,
      `Güç: P = Q / süre = ${fmt(energyJoules)} / (${fmt(minutes)} × 60) = ${fmt(powerW)} W = ${fmt(powerKW)} kW`,
    ],
  };
}

/** Registry metadata for the water heating calculator. */
export const suIsitmaMeta: Calculator = {
  id: 'su-isitma-gucu',
  slug: 'su-isitma-gucu-hesaplayici',
  categoryId: 'hvac',
  title: 'Su Isıtma Gücü Hesaplayıcı',
  description:
    'Belirli hacimdeki suyu istenen sıcaklığa ısıtmak için gereken enerjiyi (kWh) ve gücü (kW, BTU/saat, kcal/saat) hesaplayın.',
  keywords: [
    'su ısıtma enerjisi',
    'su ısıtma gücü',
    'kombi kapasitesi hesaplama',
    'su ısıtıcı güç hesaplama',
    'ısıtma enerjisi',
    'kWh su ısıtma',
  ],
  relatedTools: ['su-debisi', 'pompa-gucu', 'sicaklik-donusturucu'],
  faq: [
    {
      question: 'Su ısıtmak için gereken enerji nasıl hesaplanır?',
      answer:
        'Isıtma enerjisi Q = m × c × ΔT formülüyle bulunur: kütle (kg) × suyun özgül ısısı (yaklaşık 4186 J/kg·°C) × sıcaklık farkı (°C). Su için 1 litre ≈ 1 kg alınır. Bu enerjiyi belirli bir sürede vermek için gereken ortalama güç ise enerjinin süreye (saniye) bölünmesiyle hesaplanır.',
    },
    {
      question: '1 litre suyu 1°C ısıtmak ne kadar enerji gerektirir?',
      answer:
        '1 litre (≈1 kg) suyu 1 °C ısıtmak yaklaşık 4186 joule (≈1,16 watt-saat) enerji gerektirir. Örneğin 10 °C ısıtmak için bu değerin 10 katı, 100 litre için ayrıca 100 katı enerji gerekir.',
    },
  ],
};
