/**
 * Voltage drop calculator — pure logic.
 *
 * Resistive (approximate) model for a copper conductor at ~20 °C:
 *   ρ = 0.0175 Ω·mm²/m
 *   1φ: ΔU = 2 · L · I · ρ / A      3φ: ΔU = √3 · L · I · ρ / A
 * For 3φ the system voltage is line-to-line. No React/Astro/DOM imports.
 *
 * The low-level `voltageDropVolts` helper and `STANDARD_CROSS_SECTIONS_MM2` are
 * exported for reuse by the cable-sizing (Kablo Kesiti) calculator.
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** Resistivity of copper [Ω·mm²/m], resistive approximation at ~20 °C. */
export const RHO_COPPER = 0.0175;

/** Standard conductor cross-sections [mm²] (IEC series). */
export const STANDARD_CROSS_SECTIONS_MM2 = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240,
] as const;

/**
 * Pure voltage-drop math (NO validation) — callers (cable sizing) pass already
 * sane values. Returns ΔU in volts for a copper conductor.
 */
export function voltageDropVolts(
  phase: 1 | 3,
  currentA: number,
  lengthM: number,
  crossSectionMm2: number,
): number {
  const factor = phase === 3 ? Math.sqrt(3) : 2;
  return (factor * lengthM * currentA * RHO_COPPER) / crossSectionMm2;
}

export interface VoltageDropInput {
  /** 1 or 3 (phase count). */
  phase?: number;
  /** System voltage V [V] (line-to-line for 3φ). */
  voltage?: number;
  /** Line current I [A]. */
  current?: number;
  /** One-way line length L [m]. */
  length?: number;
  /** Conductor cross-section A [mm²] — must be a standard section. */
  crossSection?: number;
}

export interface VoltageDropValues {
  /** Voltage drop ΔU [V]. */
  readonly voltageDrop: number;
  /** Drop as a percentage of the system voltage [%]. */
  readonly dropPercent: number;
  /** Voltage at the load end V − ΔU [V]. */
  readonly loadVoltage: number;
}

export interface VoltageDropSuccess {
  readonly values: VoltageDropValues;
  readonly steps: readonly string[];
}

export type VoltageDropResult = CalcResult<VoltageDropSuccess>;

export const VOLTAGE_DROP_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  INVALID_PHASE: 'INVALID_PHASE',
  INVALID_CROSS_SECTION: 'INVALID_CROSS_SECTION',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Compute the voltage drop (V and %) for a copper run. Pure and total — returns
 * a failure object (never throws) for invalid input or out-of-range result.
 */
export function solveVoltageDrop(input: VoltageDropInput): VoltageDropResult {
  if (input.phase !== 1 && input.phase !== 3) {
    return fail<VoltageDropSuccess>(
      VOLTAGE_DROP_ERROR.INVALID_PHASE,
      'Faz sayısı 1 veya 3 olmalıdır.',
    );
  }

  const numerics: { key: 'voltage' | 'current' | 'length'; label: string }[] = [
    { key: 'voltage', label: 'Gerilim (V)' },
    { key: 'current', label: 'Akım (I)' },
    { key: 'length', label: 'Hat uzunluğu (L)' },
  ];
  for (const { key, label } of numerics) {
    const value = input[key];
    if (value === undefined) {
      return fail<VoltageDropSuccess>(
        VOLTAGE_DROP_ERROR.MISSING_VALUE,
        `${label} girilmelidir.`,
      );
    }
    if (!Number.isFinite(value)) {
      return fail<VoltageDropSuccess>(
        VOLTAGE_DROP_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<VoltageDropSuccess>(
        VOLTAGE_DROP_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const crossSection = input.crossSection;
  if (crossSection === undefined) {
    return fail<VoltageDropSuccess>(
      VOLTAGE_DROP_ERROR.MISSING_VALUE,
      'İletken kesiti seçilmelidir.',
    );
  }
  if (!(STANDARD_CROSS_SECTIONS_MM2 as readonly number[]).includes(crossSection)) {
    return fail<VoltageDropSuccess>(
      VOLTAGE_DROP_ERROR.INVALID_CROSS_SECTION,
      'İletken kesiti standart değerlerden biri olmalıdır.',
    );
  }

  const phase: 1 | 3 = input.phase === 1 ? 1 : 3;
  const v = input.voltage!;
  const i = input.current!;
  const l = input.length!;

  const voltageDrop = voltageDropVolts(phase, i, l, crossSection);
  const dropPercent = (voltageDrop / v) * 100;
  const loadVoltage = v - voltageDrop;

  if (
    ![voltageDrop, dropPercent, loadVoltage].every(Number.isFinite) ||
    voltageDrop <= 0 ||
    dropPercent <= 0 ||
    loadVoltage <= 0
  ) {
    return fail<VoltageDropSuccess>(
      VOLTAGE_DROP_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const factorLabel = phase === 3 ? '√3' : '2';
  const factorValue = phase === 3 ? fmt(Math.sqrt(3)) : '2';

  return {
    ok: true,
    values: { voltageDrop, dropPercent, loadVoltage },
    steps: [
      `Gerilim düşümü: ΔU = ${factorLabel} × L × I × ρ / A = ${factorValue} × ${fmt(l)} × ${fmt(i)} × ${fmt(RHO_COPPER)} / ${fmt(crossSection)} = ${fmt(voltageDrop)} V`,
      `Yüzde düşüm: %ΔU = ΔU / V × 100 = ${fmt(voltageDrop)} / ${fmt(v)} × 100 = ${fmt(dropPercent)} %`,
    ],
  };
}

/** Registry metadata for the voltage drop calculator. */
export const voltageDropMeta: Calculator = {
  id: 'gerilim-dusumu',
  slug: 'gerilim-dusumu-hesaplayici',
  categoryId: 'electrical',
  title: 'Gerilim Düşümü Hesaplayıcı',
  description:
    'Hat uzunluğu, akım ve iletken kesitine göre kablodaki gerilim düşümünü (V ve %) hesaplayın.',
  formula: 'ΔU = √3·L·I·ρ/A (3 faz)',
  keywords: [
    'gerilim düşümü hesaplama',
    'kablo gerilim düşümü',
    'voltaj düşümü hesaplama',
    'yüzde gerilim düşümü',
    'hat kaybı',
  ],
  relatedTools: ['kablo-kesiti', 'amper-hesabi', 'ohms-law'],
  faq: [
    {
      question: 'Gerilim düşümü neden önemlidir, sınırı nedir?',
      answer:
        'Hat boyunca gerilim düşerse cihazlar düşük gerilimle çalışır; motorlar zorlanır, aydınlatma kararır ve kayıplar artar. IEC 60364’e göre tipik sınır aydınlatma devrelerinde %3, diğer devrelerde %5’tir.',
    },
    {
      question: 'Gerilim düşümünü azaltmak için ne yapılır?',
      answer:
        'En etkili yöntem iletken kesitini büyütmektir (ΔU kesitle ters orantılıdır). Ayrıca hat uzunluğunu kısaltmak, mümkünse üç faz/daha yüksek gerilim kullanmak ve yükü dengelemek gerilim düşümünü azaltır.',
    },
  ],
};
