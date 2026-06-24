/**
 * Power triangle calculator — pure logic.
 *
 * Given exactly two of {P, Q, S, cosφ}, resolve the other two for an inductive
 * (lagging) load (Q ≥ 0). Units: P [kW], Q [kvar], S [kVA] — consistent, so
 * S² = P² + Q² holds directly; cosφ is dimensionless. No React/Astro/DOM here.
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** User-supplied quantities. The caller provides EXACTLY TWO of the four. */
export interface PowerTriangleInput {
  /** Active power P [kW]. */
  activePower?: number;
  /** Reactive power Q [kvar]. */
  reactivePower?: number;
  /** Apparent power S [kVA]. */
  apparentPower?: number;
  /** Power factor cosφ [–], in (0, 1]. */
  powerFactor?: number;
}

/** All four quantities, fully resolved (P [kW], Q [kvar], S [kVA], cosφ [–]). */
export interface PowerTriangleValues {
  readonly activePower: number;
  readonly reactivePower: number;
  readonly apparentPower: number;
  readonly powerFactor: number;
}

export interface PowerTriangleSuccess {
  readonly values: PowerTriangleValues;
  readonly steps: readonly string[];
}

export type PowerTriangleResult = CalcResult<PowerTriangleSuccess>;

export const POWER_TRIANGLE_ERROR = {
  INSUFFICIENT_VALUES: 'INSUFFICIENT_VALUES',
  TOO_MANY_VALUES: 'TOO_MANY_VALUES',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  /** cosφ outside (0, 1]. */
  POWER_FACTOR_RANGE: 'POWER_FACTOR_RANGE',
  /** Given pair is geometrically impossible (e.g. S < P). */
  INFEASIBLE: 'INFEASIBLE',
  /** A computed value overflowed/underflowed out of a valid range. */
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const QUANTITIES = [
  'activePower',
  'reactivePower',
  'apparentPower',
  'powerFactor',
] as const;
type Quantity = (typeof QUANTITIES)[number];

const LABEL: Record<Quantity, string> = {
  activePower: 'Aktif güç (P)',
  reactivePower: 'Reaktif güç (Q)',
  apparentPower: 'Görünür güç (S)',
  powerFactor: 'Güç faktörü (cosφ)',
};

/** Round to 6 significant figures and drop trailing zeros for readable steps. */
function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

function buildResult(
  values: PowerTriangleValues,
  steps: readonly string[],
): PowerTriangleResult {
  const { activePower, reactivePower, apparentPower, powerFactor } = values;
  const allFinite = [activePower, reactivePower, apparentPower, powerFactor].every(
    Number.isFinite,
  );
  // P, S, cosφ are strictly positive; Q may be 0 (unity power factor).
  const inRange =
    activePower > 0 &&
    apparentPower > 0 &&
    powerFactor > 0 &&
    reactivePower >= 0;
  if (!allFinite || !inRange) {
    return fail<PowerTriangleSuccess>(
      POWER_TRIANGLE_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }
  return { ok: true, values, steps };
}

/**
 * Solve the power triangle from exactly two of {P, Q, S, cosφ}. Pure and total —
 * returns a failure object (never throws) for invalid/infeasible input.
 */
export function solvePowerTriangle(
  input: PowerTriangleInput,
): PowerTriangleResult {
  const provided = QUANTITIES.filter((q) => input[q] !== undefined);

  if (provided.length < 2) {
    return fail<PowerTriangleSuccess>(
      POWER_TRIANGLE_ERROR.INSUFFICIENT_VALUES,
      'Hesaplama için tam olarak iki değer girilmelidir; daha az değer girildi.',
    );
  }
  if (provided.length > 2) {
    return fail<PowerTriangleSuccess>(
      POWER_TRIANGLE_ERROR.TOO_MANY_VALUES,
      'Hesaplama için tam olarak iki değer girilmelidir; ikiden fazla değer girildi.',
    );
  }

  for (const q of provided) {
    const value = input[q]!;
    if (!Number.isFinite(value)) {
      return fail<PowerTriangleSuccess>(
        POWER_TRIANGLE_ERROR.INVALID_NUMBER,
        `${LABEL[q]} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (q === 'powerFactor') {
      if (value <= 0 || value > 1) {
        return fail<PowerTriangleSuccess>(
          POWER_TRIANGLE_ERROR.POWER_FACTOR_RANGE,
          'Güç faktörü (cosφ) 0 ile 1 arasında olmalıdır (0 < cosφ ≤ 1).',
        );
      }
    } else if (value <= 0) {
      return fail<PowerTriangleSuccess>(
        POWER_TRIANGLE_ERROR.NON_POSITIVE_VALUE,
        `${LABEL[q]} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const pair = `${provided[0]}+${provided[1]}`;

  switch (pair) {
    case 'activePower+reactivePower': {
      const p = input.activePower!;
      const q = input.reactivePower!;
      const s = Math.sqrt(p * p + q * q);
      const cosphi = p / s;
      return buildResult(
        { activePower: p, reactivePower: q, apparentPower: s, powerFactor: cosphi },
        [
          `Görünür güç: S = √(P² + Q²) = √(${fmt(p)}² + ${fmt(q)}²) = ${fmt(s)} kVA`,
          `Güç faktörü: cosφ = P / S = ${fmt(p)} / ${fmt(s)} = ${fmt(cosphi)}`,
        ],
      );
    }
    case 'activePower+apparentPower': {
      const p = input.activePower!;
      const s = input.apparentPower!;
      if (s < p) {
        return fail<PowerTriangleSuccess>(
          POWER_TRIANGLE_ERROR.INFEASIBLE,
          'Görünür güç (S), aktif güçten (P) küçük olamaz.',
        );
      }
      const cosphi = p / s;
      const q = Math.sqrt(Math.max(0, s * s - p * p));
      return buildResult(
        { activePower: p, reactivePower: q, apparentPower: s, powerFactor: cosphi },
        [
          `Güç faktörü: cosφ = P / S = ${fmt(p)} / ${fmt(s)} = ${fmt(cosphi)}`,
          `Reaktif güç: Q = √(S² − P²) = √(${fmt(s)}² − ${fmt(p)}²) = ${fmt(q)} kvar`,
        ],
      );
    }
    case 'activePower+powerFactor': {
      const p = input.activePower!;
      const cosphi = input.powerFactor!;
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
      const s = p / cosphi;
      const q = s * sinphi;
      return buildResult(
        { activePower: p, reactivePower: q, apparentPower: s, powerFactor: cosphi },
        [
          `Görünür güç: S = P / cosφ = ${fmt(p)} / ${fmt(cosphi)} = ${fmt(s)} kVA`,
          `Reaktif güç: Q = S × sinφ = ${fmt(s)} × ${fmt(sinphi)} = ${fmt(q)} kvar`,
        ],
      );
    }
    case 'reactivePower+apparentPower': {
      const q = input.reactivePower!;
      const s = input.apparentPower!;
      // S must be strictly greater than Q: S < Q is geometrically impossible and
      // S = Q is a pure-reactive load (P = 0, cosφ = 0) outside the supported
      // cosφ ∈ (0, 1] domain. Reject both as INFEASIBLE with a clear message
      // rather than letting P = 0 fall through to the generic range guard.
      if (s <= q) {
        return fail<PowerTriangleSuccess>(
          POWER_TRIANGLE_ERROR.INFEASIBLE,
          'Görünür güç (S), reaktif güçten (Q) büyük olmalıdır (saf reaktif yük desteklenmez).',
        );
      }
      const p = Math.sqrt(Math.max(0, s * s - q * q));
      const cosphi = p / s;
      return buildResult(
        { activePower: p, reactivePower: q, apparentPower: s, powerFactor: cosphi },
        [
          `Aktif güç: P = √(S² − Q²) = √(${fmt(s)}² − ${fmt(q)}²) = ${fmt(p)} kW`,
          `Güç faktörü: cosφ = P / S = ${fmt(p)} / ${fmt(s)} = ${fmt(cosphi)}`,
        ],
      );
    }
    case 'reactivePower+powerFactor': {
      const q = input.reactivePower!;
      const cosphi = input.powerFactor!;
      if (cosphi >= 1) {
        return fail<PowerTriangleSuccess>(
          POWER_TRIANGLE_ERROR.INFEASIBLE,
          'Reaktif güç ile birlikte güç faktörü 1 olamaz (sinφ = 0).',
        );
      }
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
      const s = q / sinphi;
      const p = s * cosphi;
      return buildResult(
        { activePower: p, reactivePower: q, apparentPower: s, powerFactor: cosphi },
        [
          `Görünür güç: S = Q / sinφ = ${fmt(q)} / ${fmt(sinphi)} = ${fmt(s)} kVA`,
          `Aktif güç: P = S × cosφ = ${fmt(s)} × ${fmt(cosphi)} = ${fmt(p)} kW`,
        ],
      );
    }
    case 'apparentPower+powerFactor': {
      const s = input.apparentPower!;
      const cosphi = input.powerFactor!;
      const sinphi = Math.sqrt(Math.max(0, 1 - cosphi * cosphi));
      const p = s * cosphi;
      const q = s * sinphi;
      return buildResult(
        { activePower: p, reactivePower: q, apparentPower: s, powerFactor: cosphi },
        [
          `Aktif güç: P = S × cosφ = ${fmt(s)} × ${fmt(cosphi)} = ${fmt(p)} kW`,
          `Reaktif güç: Q = S × sinφ = ${fmt(s)} × ${fmt(sinphi)} = ${fmt(q)} kvar`,
        ],
      );
    }
    default:
      // Unreachable: exactly two known quantities always match a case above.
      return fail<PowerTriangleSuccess>(
        POWER_TRIANGLE_ERROR.INSUFFICIENT_VALUES,
        'Geçersiz değer kombinasyonu.',
      );
  }
}

/** Registry metadata for the power triangle calculator. */
export const powerTriangleMeta: Calculator = {
  id: 'guc-ucgeni',
  slug: 'guc-ucgeni-hesaplayici',
  categoryId: 'electrical',
  title: 'Güç Üçgeni Hesaplayıcı',
  description:
    'Aktif, reaktif ve görünür güç ile güç faktöründen herhangi ikisini girin; kalan değerler hesaplanır.',
  formula: 'S² = P² + Q² · P = S·cosφ',
  keywords: [
    'güç üçgeni',
    'aktif reaktif görünür güç',
    'cosφ hesaplama',
    'kVA kW kvar',
    'güç faktörü',
  ],
  relatedTools: ['guc-hesabi', 'kompanzasyon', 'amper-hesabi'],
  faq: [
    {
      question: 'Aktif, reaktif ve görünür güç arasındaki fark nedir?',
      answer:
        'Aktif güç (P, kW) işe dönüşen gerçek güçtür. Reaktif güç (Q, kvar) endüktif/kapasitif yüklerin manyetik alan için aldığı, işe dönüşmeyen güçtür. Görünür güç (S, kVA) ikisinin vektörel toplamıdır: S² = P² + Q². Üçü bir dik üçgen oluşturur.',
    },
    {
      question: 'Güç faktörü (cosφ) ne anlama gelir?',
      answer:
        'Güç faktörü cosφ = P / S oranıdır ve aktif gücün görünür güce oranını verir. 1’e yakın olması yükün verimli (çoğunlukla aktif) olduğunu, düşük olması yüksek reaktif güç çekildiğini gösterir.',
    },
  ],
};
