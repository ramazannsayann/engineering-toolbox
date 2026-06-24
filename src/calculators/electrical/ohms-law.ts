/**
 * Ohm's Law calculator — pure logic.
 *
 * This is the reference module every future calculator copies: it exports an
 * input type, a pure solve function (no React/Astro/DOM imports), and a
 * `Calculator` metadata object for the registry. Nothing here touches the UI.
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** User-supplied quantities. The caller provides EXACTLY TWO of the four. */
export interface OhmsLawInput {
  /** Voltage in volts (V). */
  voltage?: number;
  /** Current in amperes (A). */
  current?: number;
  /** Resistance in ohms (Ω). */
  resistance?: number;
  /** Power in watts (W). */
  power?: number;
}

/** All four quantities, fully resolved (base units: V, A, Ω, W). */
export interface OhmsLawValues {
  readonly voltage: number;
  readonly current: number;
  readonly resistance: number;
  readonly power: number;
}

/** Success payload: every value plus a human-readable derivation. */
export interface OhmsLawSuccess {
  readonly values: OhmsLawValues;
  /** Short Turkish lines for the "Adım adım çözüm" UI (added in a later chunk). */
  readonly steps: readonly string[];
}

export type OhmsLawResult = CalcResult<OhmsLawSuccess>;

/** Stable error codes returned by {@link solveOhmsLaw}. */
export const OHMS_LAW_ERROR = {
  /** Fewer than two quantities provided. */
  INSUFFICIENT_VALUES: 'INSUFFICIENT_VALUES',
  /** More than two quantities provided. */
  TOO_MANY_VALUES: 'TOO_MANY_VALUES',
  /** A provided value is zero or negative. */
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  /** A provided value is NaN or not finite. */
  INVALID_NUMBER: 'INVALID_NUMBER',
  /** A computed value overflowed to Infinity or underflowed to 0. */
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const QUANTITIES = ['voltage', 'current', 'resistance', 'power'] as const;
type Quantity = (typeof QUANTITIES)[number];

const LABEL: Record<Quantity, string> = {
  voltage: 'Gerilim',
  current: 'Akım',
  resistance: 'Direnç',
  power: 'Güç',
};

/** Round to 6 significant figures and drop trailing zeros for readable steps. */
function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Finalize a result. Re-validates the COMPUTED outputs before reporting success:
 * large/small finite inputs can overflow a product to Infinity or underflow a
 * quotient to 0, which must surface as a failure rather than a bogus `ok: true`.
 */
function buildResult(
  values: OhmsLawValues,
  steps: readonly string[],
): OhmsLawResult {
  for (const q of QUANTITIES) {
    const value = values[q];
    if (!Number.isFinite(value) || value <= 0) {
      return fail<OhmsLawSuccess>(
        OHMS_LAW_ERROR.RESULT_OUT_OF_RANGE,
        'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
      );
    }
  }
  return { ok: true, values, steps };
}

/**
 * Solve Ohm's Law: given exactly two of {voltage, current, resistance, power},
 * compute the other two. Pure and total — returns a failure object (never
 * throws) for any invalid input or out-of-range result.
 */
export function solveOhmsLaw(input: OhmsLawInput): OhmsLawResult {
  const provided = QUANTITIES.filter((q) => input[q] !== undefined);

  if (provided.length < 2) {
    return fail<OhmsLawSuccess>(
      OHMS_LAW_ERROR.INSUFFICIENT_VALUES,
      'Hesaplama için tam olarak iki değer girilmelidir; daha az değer girildi.',
    );
  }
  if (provided.length > 2) {
    return fail<OhmsLawSuccess>(
      OHMS_LAW_ERROR.TOO_MANY_VALUES,
      'Hesaplama için tam olarak iki değer girilmelidir; ikiden fazla değer girildi.',
    );
  }

  // Validate each provided value. Finiteness is checked first so that
  // NaN/±Infinity report INVALID_NUMBER rather than slipping into the > 0 check.
  for (const q of provided) {
    const value = input[q]!;
    if (!Number.isFinite(value)) {
      return fail<OhmsLawSuccess>(
        OHMS_LAW_ERROR.INVALID_NUMBER,
        `${LABEL[q]} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<OhmsLawSuccess>(
        OHMS_LAW_ERROR.NON_POSITIVE_VALUE,
        `${LABEL[q]} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  // `provided` follows the canonical QUANTITIES order, so the key below always
  // matches one of the six cases. All divisors are guaranteed > 0 above.
  const pair = `${provided[0]}+${provided[1]}`;

  switch (pair) {
    case 'voltage+current': {
      const v = input.voltage!;
      const i = input.current!;
      const r = v / i;
      const p = v * i;
      return buildResult({ voltage: v, current: i, resistance: r, power: p }, [
        `Direnç: R = V / I = ${fmt(v)} / ${fmt(i)} = ${fmt(r)} Ω`,
        `Güç: P = V × I = ${fmt(v)} × ${fmt(i)} = ${fmt(p)} W`,
      ]);
    }
    case 'voltage+resistance': {
      const v = input.voltage!;
      const r = input.resistance!;
      const i = v / r;
      const p = (v * v) / r;
      return buildResult({ voltage: v, current: i, resistance: r, power: p }, [
        `Akım: I = V / R = ${fmt(v)} / ${fmt(r)} = ${fmt(i)} A`,
        `Güç: P = V² / R = ${fmt(v)}² / ${fmt(r)} = ${fmt(p)} W`,
      ]);
    }
    case 'voltage+power': {
      const v = input.voltage!;
      const p = input.power!;
      const i = p / v;
      const r = (v * v) / p;
      return buildResult({ voltage: v, current: i, resistance: r, power: p }, [
        `Akım: I = P / V = ${fmt(p)} / ${fmt(v)} = ${fmt(i)} A`,
        `Direnç: R = V² / P = ${fmt(v)}² / ${fmt(p)} = ${fmt(r)} Ω`,
      ]);
    }
    case 'current+resistance': {
      const i = input.current!;
      const r = input.resistance!;
      const v = i * r;
      const p = i * i * r;
      return buildResult({ voltage: v, current: i, resistance: r, power: p }, [
        `Gerilim: V = I × R = ${fmt(i)} × ${fmt(r)} = ${fmt(v)} V`,
        `Güç: P = I² × R = ${fmt(i)}² × ${fmt(r)} = ${fmt(p)} W`,
      ]);
    }
    case 'current+power': {
      const i = input.current!;
      const p = input.power!;
      const v = p / i;
      const r = p / (i * i);
      return buildResult({ voltage: v, current: i, resistance: r, power: p }, [
        `Gerilim: V = P / I = ${fmt(p)} / ${fmt(i)} = ${fmt(v)} V`,
        `Direnç: R = P / I² = ${fmt(p)} / ${fmt(i)}² = ${fmt(r)} Ω`,
      ]);
    }
    case 'resistance+power': {
      const r = input.resistance!;
      const p = input.power!;
      const v = Math.sqrt(p * r);
      const i = Math.sqrt(p / r);
      return buildResult({ voltage: v, current: i, resistance: r, power: p }, [
        `Gerilim: V = √(P × R) = √(${fmt(p)} × ${fmt(r)}) = ${fmt(v)} V`,
        `Akım: I = √(P / R) = √(${fmt(p)} / ${fmt(r)}) = ${fmt(i)} A`,
      ]);
    }
    default:
      // Unreachable: exactly two known quantities always match a case above.
      return fail<OhmsLawSuccess>(
        OHMS_LAW_ERROR.INSUFFICIENT_VALUES,
        'Geçersiz değer kombinasyonu.',
      );
  }
}

/** Registry metadata for the Ohm's Law calculator. */
export const ohmsLawMeta: Calculator = {
  id: 'ohms-law',
  slug: 'ohm-yasasi-hesaplayici',
  categoryId: 'electrical',
  title: 'Ohm Yasası Hesaplayıcı',
  description:
    'Gerilim, akım, direnç ve güçten herhangi ikisini girin; kalan değerler otomatik hesaplanır.',
  formula: 'V = I × R · P = V × I',
  keywords: [
    'ohm yasası',
    'ohm kanunu',
    'gerilim akım direnç hesaplama',
    'güç hesaplama',
    'V=IR',
  ],
  relatedTools: ['kablo-kesiti', 'gerilim-dusumu', 'guc-hesabi'],
  faq: [
    {
      question: 'Ohm yasası nedir?',
      answer:
        'Ohm yasası, bir iletkenden geçen akımın (I) uçlarındaki gerilimle (V) doğru, direnciyle (R) ters orantılı olduğunu söyler: V = I × R. Yani gerilim, akım ile direncin çarpımına eşittir.',
    },
    {
      question: 'Gücü nasıl hesaplarım?',
      answer:
        'Elektriksel güç P = V × I ile bulunur. Ohm yasasıyla birlikte bu, P = I² × R ve P = V² / R biçiminde de yazılabilir; böylece elinizdeki iki büyüklüğe göre gücü hesaplayabilirsiniz.',
    },
  ],
};
