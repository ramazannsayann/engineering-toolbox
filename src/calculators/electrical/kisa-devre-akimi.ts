/**
 * Short-circuit current calculator — pure logic.
 *
 * Prospective short-circuit current at the transformer LV terminals, under the
 * INFINITE-BUS assumption (upstream source impedance and cable impedance are
 * ignored — so the result is an upper bound).
 *   3φ: I_n = S·1000 / (√3·V)        1φ: I_n = S·1000 / V        [A]
 *   I_k = I_n / (uk/100)             [A] → reported in kA
 * For 3φ the voltage is line-to-line. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export interface ShortCircuitInput {
  /** 1 or 3 (phase count). */
  phase?: number;
  /** Transformer rating S [kVA]. */
  transformerKva?: number;
  /** Secondary voltage V [V] (line-to-line for 3φ). */
  voltageV?: number;
  /** Impedance voltage uk [%], in (0, 100]. Typical 4–6. */
  impedancePercent?: number;
}

export interface ShortCircuitValues {
  /** Rated (nominal) current I_n [A]. */
  readonly nominalCurrentA: number;
  /** Prospective short-circuit current I_k [kA]. */
  readonly shortCircuitKa: number;
}

export interface ShortCircuitSuccess {
  readonly values: ShortCircuitValues;
  readonly steps: readonly string[];
}

export type ShortCircuitResult = CalcResult<ShortCircuitSuccess>;

export const SHORT_CIRCUIT_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  IMPEDANCE_RANGE: 'IMPEDANCE_RANGE',
  INVALID_PHASE: 'INVALID_PHASE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

const SQRT3 = Math.sqrt(3);

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Compute the prospective short-circuit current at the transformer terminals
 * (infinite-bus). Pure and total — returns a failure object (never throws).
 */
export function solveShortCircuit(input: ShortCircuitInput): ShortCircuitResult {
  if (input.phase !== 1 && input.phase !== 3) {
    return fail<ShortCircuitSuccess>(
      SHORT_CIRCUIT_ERROR.INVALID_PHASE,
      'Faz sayısı 1 veya 3 olmalıdır.',
    );
  }

  const positives: { key: 'transformerKva' | 'voltageV'; label: string }[] = [
    { key: 'transformerKva', label: 'Trafo gücü (S)' },
    { key: 'voltageV', label: 'Sekonder gerilim (V)' },
  ];
  for (const { key, label } of positives) {
    const value = input[key];
    if (value === undefined) {
      return fail<ShortCircuitSuccess>(SHORT_CIRCUIT_ERROR.MISSING_VALUE, `${label} girilmelidir.`);
    }
    if (!Number.isFinite(value)) {
      return fail<ShortCircuitSuccess>(
        SHORT_CIRCUIT_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<ShortCircuitSuccess>(
        SHORT_CIRCUIT_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const uk = input.impedancePercent;
  if (uk === undefined) {
    return fail<ShortCircuitSuccess>(
      SHORT_CIRCUIT_ERROR.MISSING_VALUE,
      'Empedans gerilimi (uk%) girilmelidir.',
    );
  }
  if (!Number.isFinite(uk)) {
    return fail<ShortCircuitSuccess>(
      SHORT_CIRCUIT_ERROR.INVALID_NUMBER,
      'Empedans gerilimi (uk%) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (uk <= 0 || uk > 100) {
    return fail<ShortCircuitSuccess>(
      SHORT_CIRCUIT_ERROR.IMPEDANCE_RANGE,
      'Empedans gerilimi (uk%) 0 ile 100 arasında olmalıdır (0 < uk ≤ 100).',
    );
  }

  const phase: 1 | 3 = input.phase === 1 ? 1 : 3;
  const s = input.transformerKva!;
  const v = input.voltageV!;

  const nominalCurrentA = (s * 1000) / (phase === 3 ? SQRT3 * v : v);
  const shortCircuitA = nominalCurrentA / (uk / 100);
  const shortCircuitKa = shortCircuitA / 1000;

  if (
    ![nominalCurrentA, shortCircuitKa].every(Number.isFinite) ||
    nominalCurrentA <= 0 ||
    shortCircuitKa <= 0
  ) {
    return fail<ShortCircuitSuccess>(
      SHORT_CIRCUIT_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const nominalStep =
    phase === 3
      ? `Anma akımı: I_n = S × 1000 / (√3 × V) = ${fmt(s * 1000)} / (${fmt(SQRT3)} × ${fmt(v)}) = ${fmt(nominalCurrentA)} A`
      : `Anma akımı: I_n = S × 1000 / V = ${fmt(s * 1000)} / ${fmt(v)} = ${fmt(nominalCurrentA)} A`;

  return {
    ok: true,
    values: { nominalCurrentA, shortCircuitKa },
    steps: [
      nominalStep,
      `Kısa devre akımı: I_k = I_n / (uk/100) = ${fmt(nominalCurrentA)} / ${fmt(uk / 100)} = ${fmt(shortCircuitA)} A = ${fmt(shortCircuitKa)} kA`,
    ],
  };
}

/** Registry metadata for the short-circuit current calculator. */
export const shortCircuitMeta: Calculator = {
  id: 'kisa-devre-akimi',
  slug: 'kisa-devre-akimi-hesaplayici',
  categoryId: 'electrical',
  title: 'Kısa Devre Akımı Hesaplayıcı',
  description:
    'Transformatör gücü, sekonder gerilim ve empedans gerilimine göre terminaldeki kısa devre akımını hesaplayın (sonsuz bara varsayımı).',
  formula: 'Ik = In / (uk%) , In = S/(√3·V)',
  keywords: [
    'kısa devre akımı hesaplama',
    'kısa devre akımı',
    'trafo kısa devre',
    'Ik hesaplama',
    'empedans gerilimi',
  ],
  relatedTools: ['trafo-boyutlandirma', 'kablo-kesiti', 'guc-hesabi'],
  faq: [
    {
      question: 'Kısa devre akımı neden hesaplanır?',
      answer:
        'Kesici ve sigortaların kesme kapasitesinin (kA) arıza akımından büyük seçilmesi, baraların ve kabloların kısa devre dayanımının doğrulanması için gerekir. Yetersiz kesme kapasiteli bir cihaz arıza anında patlayabilir.',
    },
    {
      question: 'Empedans gerilimi (uk%) nedir?',
      answer:
        'uk%, transformatörün sekonderini kısa devre edip primerden anma akımını akıtmak için gereken gerilimin anma gerilimine oranıdır. Trafonun iç empedansını temsil eder; küçük uk% daha yüksek kısa devre akımı demektir. Bu hesap sonsuz bara varsayar; gerçek arıza akımı üst şebeke ve kablo empedansıyla daha düşüktür ve kesin değer için IEC 60909 etüdü gerekir.',
    },
  ],
};
