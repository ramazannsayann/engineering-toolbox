/**
 * LED series (current-limiting) resistor calculator — pure logic.
 *
 * From the supply voltage, the LED forward voltage and the desired forward
 * current, compute the required series resistor and its power dissipation, then
 * recommend the nearest standard E24 resistor (rounded UP so the current never
 * exceeds the target) and the smallest standard power rating that covers it.
 *
 *   R   = (V_supply − V_f) / (I_f/1000)      [Ω]   (I_f given in mA)
 *   P_R = (V_supply − V_f) · (I_f/1000)      [W]
 *
 * No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface LedResistorInput {
  /** Supply voltage V_supply [V]. */
  supplyVoltageV?: number;
  /** LED forward voltage V_f [V] (≈1.8–3.3 V depending on colour). */
  ledForwardVoltageV?: number;
  /** LED forward current I_f [mA] (typically ~20 mA). */
  ledCurrentMa?: number;
}

export interface LedResistorValues {
  /** Exact computed resistance R [Ω]. */
  readonly resistanceOhms: number;
  /** Resistor power dissipation P_R [W]. */
  readonly powerW: number;
  /** Nearest standard E24 value ≥ R [Ω]; null if R exceeds the E24 range. */
  readonly e24Ohms: number | null;
  /** Smallest standard power rating ≥ P_R [W]; null if P_R exceeds 2 W. */
  readonly powerRatingW: number | null;
}

export interface LedResistorSuccess {
  readonly values: LedResistorValues;
  readonly steps: readonly string[];
}

export type LedResistorResult = CalcResult<LedResistorSuccess>;

export const LED_RESISTOR_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  /** Supply voltage must exceed the LED forward voltage. */
  SUPPLY_NOT_GREATER: 'SUPPLY_NOT_GREATER',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

/** E24 base values (24 per decade, 2 significant figures). */
export const E24_BASE = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9,
  4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
] as const;

/**
 * Full E24 series across decades 1 Ω … 9.1 MΩ, ascending. Each entry is snapped
 * to 2 significant figures so float multiplication (e.g. 1.1 × 100) is exact.
 */
export const E24_SERIES: readonly number[] = (() => {
  const series: number[] = [];
  for (let decade = 0; decade <= 6; decade++) {
    for (const base of E24_BASE) {
      series.push(Number((base * Math.pow(10, decade)).toPrecision(2)));
    }
  }
  return series;
})();

/** Standard resistor power ratings [W]. */
export const POWER_RATINGS_W = [0.125, 0.25, 0.5, 1, 2] as const;

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

function validatePositive(
  value: number | undefined,
  label: string,
): CalcError | null {
  if (value === undefined) {
    return { code: LED_RESISTOR_ERROR.MISSING_VALUE, message: `${label} girilmelidir.` };
  }
  if (!Number.isFinite(value)) {
    return {
      code: LED_RESISTOR_ERROR.INVALID_NUMBER,
      message: `${label} geçerli, sonlu bir sayı olmalıdır.`,
    };
  }
  if (value <= 0) {
    return {
      code: LED_RESISTOR_ERROR.NON_POSITIVE_VALUE,
      message: `${label} sıfırdan büyük olmalıdır.`,
    };
  }
  return null;
}

interface CalcError {
  code: string;
  message: string;
}

/**
 * Compute the LED series resistor, its power and the recommended standard
 * values. Pure and total — returns a failure object (never throws).
 */
export function solveLedResistor(input: LedResistorInput): LedResistorResult {
  const checks: [number | undefined, string][] = [
    [input.supplyVoltageV, 'Besleme gerilimi (V_kaynak)'],
    [input.ledForwardVoltageV, 'LED ileri gerilimi (V_LED)'],
    [input.ledCurrentMa, 'LED ileri akımı (I_LED)'],
  ];
  for (const [value, label] of checks) {
    const error = validatePositive(value, label);
    if (error) return fail<LedResistorSuccess>(error.code, error.message);
  }

  const vSupply = input.supplyVoltageV!;
  const vLed = input.ledForwardVoltageV!;
  const iMa = input.ledCurrentMa!;

  if (vSupply <= vLed) {
    return fail<LedResistorSuccess>(
      LED_RESISTOR_ERROR.SUPPLY_NOT_GREATER,
      'Besleme gerilimi, LED ileri geriliminden büyük olmalıdır (V_kaynak > V_LED).',
    );
  }

  const deltaV = vSupply - vLed;
  const iAmps = iMa / 1000;
  const resistanceOhms = deltaV / iAmps;
  const powerW = deltaV * iAmps;

  if (
    ![resistanceOhms, powerW].every(Number.isFinite) ||
    resistanceOhms <= 0 ||
    powerW <= 0
  ) {
    return fail<LedResistorSuccess>(
      LED_RESISTOR_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const e24Ohms = E24_SERIES.find((v) => v >= resistanceOhms) ?? null;
  const powerRatingW = POWER_RATINGS_W.find((p) => p >= powerW) ?? null;

  const e24Step =
    e24Ohms !== null
      ? `Önerilen standart direnç (E24): ${fmt(e24Ohms)} Ω`
      : 'Önerilen standart direnç (E24): E24 aralığının üzerinde, özel değer gerekir';
  const powerStep =
    powerRatingW !== null
      ? `Önerilen güç değeri: ${fmt(powerRatingW)} W`
      : 'Önerilen güç değeri: 2 W üzeri, özel/yüksek güçlü direnç gerekir';

  return {
    ok: true,
    values: { resistanceOhms, powerW, e24Ohms, powerRatingW },
    steps: [
      `Gerilim farkı: V_kaynak − V_LED = ${fmt(vSupply)} − ${fmt(vLed)} = ${fmt(deltaV)} V`,
      `Direnç: R = (V_kaynak − V_LED) / I_LED = ${fmt(deltaV)} / ${fmt(iAmps)} = ${fmt(resistanceOhms)} Ω`,
      `Direnç gücü: P = (V_kaynak − V_LED) × I_LED = ${fmt(deltaV)} × ${fmt(iAmps)} = ${fmt(powerW)} W`,
      e24Step,
      powerStep,
      'Not: Güvenlik için güç değerinde bir üst kademe (≥2×) tercih edilebilir.',
    ],
  };
}

/** Registry metadata for the LED series-resistor calculator. */
export const ledResistorMeta: Calculator = {
  id: 'led-direnci',
  slug: 'led-seri-direnci-hesaplayici',
  categoryId: 'electrical',
  title: 'LED Seri Direnci Hesaplayıcı',
  description:
    'Besleme gerilimi, LED ileri gerilimi ve akımına göre gereken seri (sınırlama) direncini hesaplayın.',
  formula: 'R = (V_kaynak − V_LED) / I_LED',
  keywords: [
    'led direnci hesaplama',
    'led seri direnç',
    'led sınırlama direnci',
    'led resistor hesaplama',
    'led akım sınırlama',
  ],
  relatedTools: ['direnc-renk-kodu', 'ohms-law', '555-timer'],
  faq: [
    {
      question: 'LED için seri direnç neden gereklidir?',
      answer:
        'LED neredeyse sabit bir ileri gerilime sahiptir ve kendi akımını sınırlayamaz; doğrudan kaynağa bağlanırsa aşırı akım çekip yanar. Seri direnç, kaynak gerilimi ile LED ileri gerilimi arasındaki farkı üstlenerek akımı güvenli (örneğin 20 mA) bir değerde tutar.',
    },
    {
      question: 'Direncin güç değeri nasıl seçilir?',
      answer:
        'Direnç üzerinde harcanan güç P = (V_kaynak − V_LED) × I_LED ile bulunur. Seçilen direncin güç (watt) değeri bu değerden büyük olmalıdır; ısınmayı azaltmak için genellikle bir üst standart kademe (yaklaşık 2 kat) tercih edilir.',
    },
  ],
};
