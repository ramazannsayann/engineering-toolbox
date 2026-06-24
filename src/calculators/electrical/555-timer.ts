/**
 * 555 timer (astable mode) calculator — pure logic.
 *
 * In astable operation the capacitor charges through R1 + R2 and discharges
 * through R2, giving:
 *   f      = 1.44 / ((R1 + 2·R2)·C)          [Hz]
 *   t_high = 0.693·(R1 + R2)·C               [s]   (output HIGH)
 *   t_low  = 0.693·R2·C                       [s]   (output LOW)
 *   duty   = (R1 + R2) / (R1 + 2·R2) · 100   [%]
 *
 * R1/R2 are entered in kΩ and C in nF or µF; everything is converted to base
 * units (Ω, F) internally. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** Capacitor unit toggle. */
export type CapacitanceUnit = 'nF' | 'µF';

const CAP_UNIT_FACTOR: Record<CapacitanceUnit, number> = {
  nF: 1e-9,
  µF: 1e-6,
};

export interface TimerInput {
  /** R1 [kΩ]. */
  r1KOhm?: number;
  /** R2 [kΩ]. */
  r2KOhm?: number;
  /** Capacitance value (in the selected unit). */
  capacitance?: number;
  /** Capacitance unit. */
  capacitanceUnit?: CapacitanceUnit;
}

export interface TimerValues {
  /** Oscillation frequency f [Hz]. */
  readonly frequencyHz: number;
  /** Period T = 1/f [s]. */
  readonly periodS: number;
  /** Output HIGH time t_high [s]. */
  readonly highTimeS: number;
  /** Output LOW time t_low [s]. */
  readonly lowTimeS: number;
  /** Duty cycle [%] (always > 50% in standard astable mode). */
  readonly dutyPercent: number;
}

export interface TimerSuccess {
  readonly values: TimerValues;
  readonly steps: readonly string[];
}

export type TimerResult = CalcResult<TimerSuccess>;

export const TIMER_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  INVALID_UNIT: 'INVALID_UNIT',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

/** 555 astable constant: ln(2) ≈ 0.693 for the time terms. */
const LN2 = 0.693;
/** 1.44 ≈ 1/ln(2) folded with the (R1+2R2) charge/discharge term. */
const FREQ_CONST = 1.44;

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/** Split a frequency into a scaled number + unit (Hz/kHz/MHz). */
export function formatFrequencyParts(hz: number): { value: string; unit: string } {
  if (!Number.isFinite(hz)) return { value: '—', unit: '' };
  if (hz < 1e3) return { value: fmt(hz), unit: 'Hz' };
  if (hz < 1e6) return { value: fmt(hz / 1e3), unit: 'kHz' };
  return { value: fmt(hz / 1e6), unit: 'MHz' };
}

/** Combined "value unit" string, e.g. "4.8 kHz". */
export function formatFrequency(hz: number): string {
  const { value, unit } = formatFrequencyParts(hz);
  return unit ? `${value} ${unit}` : value;
}

/**
 * Compute the astable 555 frequency, period, on/off times and duty cycle. Pure
 * and total — returns a failure object (never throws) for invalid input.
 */
export function solveTimer(input: TimerInput): TimerResult {
  const positives: [number | undefined, string][] = [
    [input.r1KOhm, 'R1'],
    [input.r2KOhm, 'R2'],
    [input.capacitance, 'Kondansatör (C)'],
  ];
  for (const [value, label] of positives) {
    if (value === undefined) {
      return fail<TimerSuccess>(TIMER_ERROR.MISSING_VALUE, `${label} girilmelidir.`);
    }
    if (!Number.isFinite(value)) {
      return fail<TimerSuccess>(
        TIMER_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<TimerSuccess>(
        TIMER_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const unit = input.capacitanceUnit;
  if (unit !== 'nF' && unit !== 'µF') {
    return fail<TimerSuccess>(
      TIMER_ERROR.INVALID_UNIT,
      'Kondansatör birimi nF veya µF olmalıdır.',
    );
  }

  const r1 = input.r1KOhm! * 1000; // kΩ → Ω
  const r2 = input.r2KOhm! * 1000; // kΩ → Ω
  const c = input.capacitance! * CAP_UNIT_FACTOR[unit]; // → F

  const frequencyHz = FREQ_CONST / ((r1 + 2 * r2) * c);
  const highTimeS = LN2 * (r1 + r2) * c;
  const lowTimeS = LN2 * r2 * c;
  const periodS = 1 / frequencyHz;
  const dutyPercent = ((r1 + r2) / (r1 + 2 * r2)) * 100;

  if (
    ![frequencyHz, periodS, highTimeS, lowTimeS, dutyPercent].every(Number.isFinite) ||
    frequencyHz <= 0 ||
    highTimeS <= 0 ||
    lowTimeS <= 0 ||
    dutyPercent <= 0 ||
    dutyPercent >= 100
  ) {
    return fail<TimerSuccess>(
      TIMER_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const toMs = (s: number): string => fmt(s * 1000);

  return {
    ok: true,
    values: { frequencyHz, periodS, highTimeS, lowTimeS, dutyPercent },
    steps: [
      `Frekans: f = 1.44 / ((R1 + 2·R2)·C) = 1.44 / ((${fmt(r1)} + 2×${fmt(r2)})×${fmt(c)}) = ${formatFrequency(frequencyHz)}`,
      `Periyot: T = 1 / f = ${toMs(periodS)} ms`,
      `Yüksek süre: t_y = 0.693·(R1 + R2)·C = ${toMs(highTimeS)} ms`,
      `Düşük süre: t_d = 0.693·R2·C = ${toMs(lowTimeS)} ms`,
      `Görev oranı: D = (R1 + R2)/(R1 + 2·R2) = ${fmt(dutyPercent)} %`,
    ],
  };
}

/** Registry metadata for the 555 timer calculator. */
export const timerMeta: Calculator = {
  id: '555-timer',
  slug: '555-timer-frekans-hesaplayici',
  categoryId: 'electrical',
  title: '555 Timer Frekans Hesaplayıcı',
  description:
    'Astable (kararsız) modda 555 zamanlayıcı için R1, R2 ve C değerlerinden frekansı, periyodu ve görev oranını hesaplayın.',
  formula: 'f = 1.44 / ((R1 + 2·R2)·C)',
  keywords: [
    '555 timer hesaplama',
    '555 frekans hesaplama',
    'astable 555',
    '555 görev oranı',
    'ne555 hesaplama',
  ],
  relatedTools: ['led-direnci', 'direnc-renk-kodu'],
  faq: [
    {
      question: '555 astable modu nedir?',
      answer:
        'Astable (kararsız) modda 555 zamanlayıcı sürekli olarak kendi kendine HIGH ve LOW arasında salınır; harici tetikleme gerektirmeden bir kare dalga (osilatör) üretir. Frekans ve görev oranı R1, R2 ve C değerleriyle belirlenir.',
    },
    {
      question: 'Görev oranı (duty cycle) nasıl ayarlanır?',
      answer:
        'Görev oranı D = (R1 + R2) / (R1 + 2·R2) ile bulunur ve standart astable bağlantıda her zaman %50’den büyüktür. R1’i küçültüp R2’yi büyüterek %50’ye yaklaşılır; tam %50 veya altı için diyot gibi ek elemanlar gerekir.',
    },
  ],
};
