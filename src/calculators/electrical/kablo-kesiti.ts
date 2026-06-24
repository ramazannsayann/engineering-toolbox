/**
 * Cable sizing calculator (Kablo Kesiti) — pure logic. IEC 60364-5-52.
 *
 * Recommends the smallest standard COPPER cross-section that satisfies BOTH the
 * current-carrying capacity (ampacity) AND the voltage-drop limit — the larger
 * (more demanding) of the two governs.
 *
 * Reuses the voltage-drop math + standard sections from gerilim-dusumu.ts (no
 * duplicated VD model). No React/Astro/DOM imports.
 *
 * ── AMPACITY TABLE — SOURCE & CONDITIONS (audit this before shipping) ────────
 * Standard:   IEC 60364-5-52 reference-method current-carrying capacities
 *             (identical to the BS 7671 Appendix 4 reference-method tables).
 * Conductor:  Copper.
 * Conditions: Ambient 30 °C in air; NO grouping/derating applied. PVC at a 70 °C
 *             and XLPE/EPR at a 90 °C conductor temperature.
 * Conductor count: single-phase = 2 loaded conductors ("two"); three-phase =
 *             3 loaded conductors ("three").
 * Table basis: Method B1 from the single-core tables (BS 7671 4D1A / 4E1A);
 *             Methods C and E from the multicore tables (4D2A / 4E2A).
 *             Method E is multicore in free air.
 * Values triangulated across 5 independent sources (official IEC, BS 7671
 * reproductions, manufacturer datasheets, engineering references, calculator
 * sites); 10 of 12 columns at 4–5 source agreement, all pass monotonicity and
 * the B1 < C < E and PVC < XLPE orderings. NOTE: XLPE/B1 at 2.5 mm² (two=31,
 * three=28) had only 2 direct sources — medium confidence, re-check on audit.
 * Real installations may need correction factors (ambient ≠ 30 °C, grouping,
 * buried runs); those are out of scope here and stated in the UI.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import {
  voltageDropVolts,
  STANDARD_CROSS_SECTIONS_MM2,
} from './gerilim-dusumu';

export type Insulation = 'PVC' | 'XLPE';
export type InstallMethod = 'B1' | 'C' | 'E';

interface AmpacityColumns {
  /** Single-phase (2 loaded conductors). Aligned to STANDARD_CROSS_SECTIONS_MM2. */
  readonly two: readonly number[];
  /** Three-phase (3 loaded conductors). Aligned to STANDARD_CROSS_SECTIONS_MM2. */
  readonly three: readonly number[];
}

// Ampacity [A] at 30 °C, copper, per IEC 60364-5-52 (see header). Each array is
// aligned to STANDARD_CROSS_SECTIONS_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50,
// 70, 95, 120, 150, 185, 240]. A unit test asserts every column length matches.
export const AMPACITY_A_30C: Record<Insulation, Record<InstallMethod, AmpacityColumns>> = {
  PVC: {
    B1: {
      two: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 300, 341, 400],
      three: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 262, 296, 346],
    },
    C: {
      two: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461],
      three: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403],
    },
    E: {
      two: [22, 30, 40, 51, 70, 94, 119, 148, 180, 232, 282, 328, 379, 434, 514],
      three: [18.5, 25, 34, 43, 60, 80, 101, 126, 153, 196, 238, 276, 319, 364, 430],
    },
  },
  XLPE: {
    B1: {
      two: [23, 31, 42, 54, 75, 100, 133, 164, 198, 253, 306, 354, 393, 449, 528],
      three: [20, 28, 37, 48, 66, 88, 117, 144, 175, 222, 269, 312, 342, 384, 450],
    },
    C: {
      two: [24, 33, 45, 58, 80, 107, 138, 171, 209, 269, 328, 382, 441, 506, 599],
      three: [22, 30, 40, 52, 71, 96, 119, 147, 179, 229, 278, 322, 371, 424, 500],
    },
    E: {
      two: [26, 36, 49, 63, 86, 115, 149, 185, 225, 289, 352, 410, 473, 542, 641],
      three: [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538],
    },
  },
};

export type GoverningCriterion = 'ampasite' | 'gerilim düşümü' | 'ikisi de';

export interface CableSizingInput {
  /** 1 or 3 (phase count). */
  phase?: number;
  /** Design (load) current [A]. */
  loadCurrentA?: number;
  /** System voltage [V] (line-to-line for 3φ) — used for the % drop check. */
  voltageV?: number;
  /** One-way line length [m]. */
  lengthM?: number;
  insulation?: Insulation;
  method?: InstallMethod;
  /** Max allowed voltage drop [%], in (0, 100]. Typical: 5 (3 for lighting). */
  maxVoltageDropPercent?: number;
}

export interface CableSizingValues {
  /** Recommended cross-section [mm²] — the larger of the two picks. */
  readonly recommendedMm2: number;
  /** Smallest section meeting ampacity [mm²]. */
  readonly ampacityPickMm2: number;
  /** Smallest section meeting the voltage-drop limit [mm²]. */
  readonly voltageDropPickMm2: number;
  /** Ampacity of the recommended section [A]. */
  readonly recommendedAmpacityA: number;
  /** Actual voltage drop of the recommended section [V]. */
  readonly recommendedDropVolts: number;
  /** Actual voltage drop of the recommended section [%]. */
  readonly recommendedDropPercent: number;
  /** Which criterion forced the choice. */
  readonly governingCriterion: GoverningCriterion;
}

export interface CableSizingSuccess {
  readonly values: CableSizingValues;
  readonly steps: readonly string[];
}

export type CableSizingResult = CalcResult<CableSizingSuccess>;

export const CABLE_SIZING_ERROR = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_NUMBER: 'INVALID_NUMBER',
  NON_POSITIVE_VALUE: 'NON_POSITIVE_VALUE',
  PERCENT_RANGE: 'PERCENT_RANGE',
  INVALID_PHASE: 'INVALID_PHASE',
  INVALID_INSULATION: 'INVALID_INSULATION',
  INVALID_METHOD: 'INVALID_METHOD',
  /** Load exceeds the largest tabulated section's rating. */
  AMPACITY_EXCEEDED: 'AMPACITY_EXCEEDED',
  /** Even the largest section cannot meet the voltage-drop limit. */
  VD_LIMIT_UNREACHABLE: 'VD_LIMIT_UNREACHABLE',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/**
 * Recommend a copper cross-section satisfying both ampacity and voltage drop.
 * Pure and total — returns a failure object (never throws) for invalid input.
 */
export function solveCableSizing(input: CableSizingInput): CableSizingResult {
  if (input.phase !== 1 && input.phase !== 3) {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.INVALID_PHASE,
      'Faz sayısı 1 veya 3 olmalıdır.',
    );
  }
  if (input.insulation !== 'PVC' && input.insulation !== 'XLPE') {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.INVALID_INSULATION,
      'Yalıtım türü PVC veya XLPE olmalıdır.',
    );
  }
  if (input.method !== 'B1' && input.method !== 'C' && input.method !== 'E') {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.INVALID_METHOD,
      'Döşeme yöntemi B1, C veya E olmalıdır.',
    );
  }

  const numerics: { key: 'loadCurrentA' | 'voltageV' | 'lengthM'; label: string }[] = [
    { key: 'loadCurrentA', label: 'Yük akımı (I)' },
    { key: 'voltageV', label: 'Gerilim (V)' },
    { key: 'lengthM', label: 'Hat uzunluğu (L)' },
  ];
  for (const { key, label } of numerics) {
    const value = input[key];
    if (value === undefined) {
      return fail<CableSizingSuccess>(
        CABLE_SIZING_ERROR.MISSING_VALUE,
        `${label} girilmelidir.`,
      );
    }
    if (!Number.isFinite(value)) {
      return fail<CableSizingSuccess>(
        CABLE_SIZING_ERROR.INVALID_NUMBER,
        `${label} geçerli, sonlu bir sayı olmalıdır.`,
      );
    }
    if (value <= 0) {
      return fail<CableSizingSuccess>(
        CABLE_SIZING_ERROR.NON_POSITIVE_VALUE,
        `${label} sıfırdan büyük olmalıdır.`,
      );
    }
  }

  const maxDrop = input.maxVoltageDropPercent;
  if (maxDrop === undefined) {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.MISSING_VALUE,
      'İzin verilen gerilim düşümü (%) girilmelidir.',
    );
  }
  if (!Number.isFinite(maxDrop)) {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.INVALID_NUMBER,
      'İzin verilen gerilim düşümü (%) geçerli, sonlu bir sayı olmalıdır.',
    );
  }
  if (maxDrop <= 0 || maxDrop > 100) {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.PERCENT_RANGE,
      'İzin verilen gerilim düşümü 0 ile 100 arasında olmalıdır (0 < % ≤ 100).',
    );
  }

  const phase: 1 | 3 = input.phase === 1 ? 1 : 3;
  const current = input.loadCurrentA!;
  const voltage = input.voltageV!;
  const length = input.lengthM!;
  const insulation = input.insulation;
  const method = input.method;

  const column = AMPACITY_A_30C[insulation][method];
  const amps = phase === 3 ? column.three : column.two;

  // 1) Ampacity pick: smallest section whose rating ≥ load current.
  const ampacityIndex = amps.findIndex((rating) => rating >= current);
  if (ampacityIndex === -1) {
    const largest = amps[amps.length - 1];
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.AMPACITY_EXCEEDED,
      `Yük akımı (${fmt(current)} A), bu döşeme için kapsanan en büyük kesidin taşıma kapasitesini (${fmt(largest)} A) aşıyor.`,
    );
  }

  // 2) Voltage-drop pick: smallest section whose % drop ≤ limit.
  const voltageDropIndex = STANDARD_CROSS_SECTIONS_MM2.findIndex(
    (section) => (voltageDropVolts(phase, current, length, section) / voltage) * 100 <= maxDrop,
  );
  if (voltageDropIndex === -1) {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.VD_LIMIT_UNREACHABLE,
      `En büyük kesitte bile gerilim düşümü %${fmt(maxDrop)} sınırının altına inmiyor; hattı kısaltın, gerilimi/yöntemi değiştirin veya sınırı yükseltin.`,
    );
  }

  // 3) Recommended = the larger (more demanding) of the two picks.
  const recommendedIndex = Math.max(ampacityIndex, voltageDropIndex);
  const recommendedMm2 = STANDARD_CROSS_SECTIONS_MM2[recommendedIndex];
  const ampacityPickMm2 = STANDARD_CROSS_SECTIONS_MM2[ampacityIndex];
  const voltageDropPickMm2 = STANDARD_CROSS_SECTIONS_MM2[voltageDropIndex];
  const recommendedAmpacityA = amps[recommendedIndex];
  const recommendedDropVolts = voltageDropVolts(phase, current, length, recommendedMm2);
  const recommendedDropPercent = (recommendedDropVolts / voltage) * 100;

  const governingCriterion: GoverningCriterion =
    ampacityIndex === voltageDropIndex
      ? 'ikisi de'
      : ampacityIndex > voltageDropIndex
        ? 'ampasite'
        : 'gerilim düşümü';

  if (
    ![recommendedMm2, recommendedAmpacityA, recommendedDropVolts, recommendedDropPercent].every(
      Number.isFinite,
    ) ||
    recommendedMm2 <= 0 ||
    recommendedAmpacityA <= 0 ||
    recommendedDropVolts <= 0 ||
    recommendedDropPercent <= 0
  ) {
    return fail<CableSizingSuccess>(
      CABLE_SIZING_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  return {
    ok: true,
    values: {
      recommendedMm2,
      ampacityPickMm2,
      voltageDropPickMm2,
      recommendedAmpacityA,
      recommendedDropVolts,
      recommendedDropPercent,
      governingCriterion,
    },
    steps: [
      `Ampasite: taşıma kapasitesi ≥ ${fmt(current)} A olan en küçük kesit → ${fmt(ampacityPickMm2)} mm² (${fmt(amps[ampacityIndex])} A)`,
      `Gerilim düşümü: %düşüm ≤ %${fmt(maxDrop)} olan en küçük kesit → ${fmt(voltageDropPickMm2)} mm²`,
      `Seçim: daha büyük kesit belirleyicidir → ${fmt(recommendedMm2)} mm² (belirleyen: ${governingCriterion})`,
      `Önerilen kesitte gerilim düşümü: ΔU = ${fmt(recommendedDropVolts)} V (%${fmt(recommendedDropPercent)})`,
    ],
  };
}

/** Registry metadata for the cable sizing calculator. */
export const cableSizingMeta: Calculator = {
  id: 'kablo-kesiti',
  slug: 'kablo-kesiti-hesaplayici',
  categoryId: 'electrical',
  title: 'Kablo Kesiti Hesaplayıcı',
  description:
    "Yük akımı, hat uzunluğu ve döşeme yöntemine göre IEC 60364'e uygun bakır iletken kesitini (ampasite + gerilim düşümü) hesaplayın.",
  formula: 'En küçük kesit: ampasite ≥ I ve %düşüm ≤ limit',
  keywords: [
    'kablo kesiti hesaplama',
    'iletken kesiti',
    'kablo çapı hesaplama',
    'IEC 60364 kablo',
    'akım taşıma kapasitesi',
  ],
  relatedTools: ['gerilim-dusumu', 'amper-hesabi', 'guc-hesabi'],
  faq: [
    {
      question: 'Kablo kesiti neye göre seçilir?',
      answer:
        'Kesit iki koşulu birden sağlamalıdır: (1) iletkenin akım taşıma kapasitesi (ampasite) yük akımına eşit veya ondan büyük olmalı; (2) hat boyunca gerilim düşümü izin verilen sınırın (tipik %3–%5) altında kalmalı. Bu iki koşulun gerektirdiği kesitlerden büyüğü seçilir. Ampasite; iletken cinsi, yalıtım, döşeme yöntemi ve ortam sıcaklığına bağlıdır (burada bakır, 30 °C, IEC 60364-5-52).',
    },
    {
      question: 'Ampasite ve gerilim düşümünden hangisi belirleyicidir?',
      answer:
        'Kısa hatlarda genellikle ampasite (ısınma) belirleyicidir. Hat uzadıkça gerilim düşümü hızla artar ve çoğu zaman ampasitenin izin verdiğinden daha büyük bir kesiti zorunlu kılar; bu durumda gerilim düşümü belirleyici olur. Hesaplayıcı her iki kriteri ayrı ayrı bulup büyüğünü önerir.',
    },
  ],
};
