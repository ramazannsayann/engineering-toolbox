/**
 * Resistor colour-code decoder (Direnç Renk Kodu) — pure logic.
 *
 * Decodes an ordered array of band colours into a resistance value, tolerance
 * and ±range. Supports 4-band ([d1,d2,mult,tol]) and 5-band
 * ([d1,d2,d3,mult,tol]) resistors. The colour tables below are the SINGLE
 * SOURCE OF TRUTH for both the maths and the picker UI (valid colours per
 * band, Turkish names). No React/Astro/DOM imports.
 *
 *   4-band: R = (d1·10 + d2) · 10^mult
 *   5-band: R = (d1·100 + d2·10 + d3) · 10^mult
 *   range = R·(1 ∓ tol/100)
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** Every colour that can appear on a band. */
export type ResistorColor =
  | 'black'
  | 'brown'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'violet'
  | 'grey'
  | 'white'
  | 'gold'
  | 'silver';

/** Number of bands. The mode toggle in the UI maps onto this. */
export type BandCount = 4 | 5;

/** What a single band position encodes. */
export type BandKind = 'digit' | 'multiplier' | 'tolerance';

/**
 * DIGIT value (0–9). Black…white only — gold/silver are NOT valid digit bands.
 * The insertion order IS the digit value (black=0 … white=9), so this object
 * doubles as the ordered list of valid digit colours.
 */
export const DIGIT_VALUE = {
  black: 0,
  brown: 1,
  red: 2,
  orange: 3,
  yellow: 4,
  green: 5,
  blue: 6,
  violet: 7,
  grey: 8,
  white: 9,
} as const satisfies Partial<Record<ResistorColor, number>>;

/** MULTIPLIER exponent n (×10^n). Black…white plus gold (−1) and silver (−2). */
export const MULTIPLIER_EXP = {
  black: 0,
  brown: 1,
  red: 2,
  orange: 3,
  yellow: 4,
  green: 5,
  blue: 6,
  violet: 7,
  grey: 8,
  white: 9,
  gold: -1,
  silver: -2,
} as const satisfies Partial<Record<ResistorColor, number>>;

/** TOLERANCE (±%). Only this subset of colours is valid for the tolerance band. */
export const TOLERANCE_PERCENT = {
  brown: 1,
  red: 2,
  green: 0.5,
  blue: 0.25,
  violet: 0.1,
  grey: 0.05,
  gold: 5,
  silver: 10,
} as const satisfies Partial<Record<ResistorColor, number>>;

/** Turkish display names — used in steps and as accessible labels in the UI. */
export const COLOR_NAME_TR: Record<ResistorColor, string> = {
  black: 'Siyah',
  brown: 'Kahverengi',
  red: 'Kırmızı',
  orange: 'Turuncu',
  yellow: 'Sarı',
  green: 'Yeşil',
  blue: 'Mavi',
  violet: 'Mor',
  grey: 'Gri',
  white: 'Beyaz',
  gold: 'Altın',
  silver: 'Gümüş',
};

const DIGIT_COLORS = Object.keys(DIGIT_VALUE) as ResistorColor[];
const MULTIPLIER_COLORS = Object.keys(MULTIPLIER_EXP) as ResistorColor[];
const TOLERANCE_COLORS = Object.keys(TOLERANCE_PERCENT) as ResistorColor[];

const VALID_COLORS: Record<BandKind, readonly ResistorColor[]> = {
  digit: DIGIT_COLORS,
  multiplier: MULTIPLIER_COLORS,
  tolerance: TOLERANCE_COLORS,
};

/** Valid colours for a band kind (the UI renders only these as swatches). */
export function validColorsFor(kind: BandKind): readonly ResistorColor[] {
  return VALID_COLORS[kind];
}

/** The ordered band kinds for a given mode. */
export function bandLayout(mode: BandCount): readonly BandKind[] {
  return mode === 5
    ? ['digit', 'digit', 'digit', 'multiplier', 'tolerance']
    : ['digit', 'digit', 'multiplier', 'tolerance'];
}

const KIND_LABEL_TR: Record<BandKind, string> = {
  digit: 'Rakam',
  multiplier: 'Çarpan',
  tolerance: 'Tolerans',
};

/** Turkish band labels for the UI, e.g. ["1. Rakam","2. Rakam","Çarpan","Tolerans"]. */
export function bandLabels(mode: BandCount): string[] {
  let digitIndex = 0;
  return bandLayout(mode).map((kind) =>
    kind === 'digit' ? `${++digitIndex}. ${KIND_LABEL_TR.digit}` : KIND_LABEL_TR[kind],
  );
}

export interface ResistorSuccess {
  /** Resistance in ohms (base unit). */
  readonly resistanceOhms: number;
  /** Tolerance as ±percent (e.g. 5 for ±5%). */
  readonly tolerancePercent: number;
  /** Pre-formatted resistance with a scaled unit, e.g. "4.7 kΩ". */
  readonly displayValue: string;
  /** Lower bound R·(1 − tol/100) [Ω]. */
  readonly minOhms: number;
  /** Upper bound R·(1 + tol/100) [Ω]. */
  readonly maxOhms: number;
  readonly steps: readonly string[];
}

export type ResistorResult = CalcResult<ResistorSuccess>;

export const RESISTOR_ERROR = {
  /** colours.length does not match the selected mode. */
  BAND_COUNT_MISMATCH: 'BAND_COUNT_MISMATCH',
  /** A band holds a colour that is invalid for that position. */
  INVALID_COLOR: 'INVALID_COLOR',
  /** A computed value overflowed/underflowed out of the valid range. */
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

/** Round to 6 significant figures and drop trailing zeros for readable output. */
function fmt(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/** Split a resistance into a scaled number + unit (mΩ/Ω/kΩ/MΩ/GΩ). */
export function formatResistanceParts(ohms: number): {
  value: string;
  unit: string;
} {
  if (!Number.isFinite(ohms)) return { value: '—', unit: '' };
  if (ohms === 0) return { value: '0', unit: 'Ω' };
  if (ohms < 1) return { value: fmt(ohms * 1000), unit: 'mΩ' };
  if (ohms < 1e3) return { value: fmt(ohms), unit: 'Ω' };
  if (ohms < 1e6) return { value: fmt(ohms / 1e3), unit: 'kΩ' };
  if (ohms < 1e9) return { value: fmt(ohms / 1e6), unit: 'MΩ' };
  return { value: fmt(ohms / 1e9), unit: 'GΩ' };
}

/** Combined "value unit" string, e.g. "4.7 kΩ". */
export function formatResistance(ohms: number): string {
  const { value, unit } = formatResistanceParts(ohms);
  return unit ? `${value} ${unit}` : value;
}

/**
 * Decode an ordered array of band colours. Pure and total — returns a failure
 * object (never throws) when the band count or any colour is invalid.
 */
export function decodeResistor(
  mode: BandCount,
  colors: readonly ResistorColor[],
): ResistorResult {
  const layout = bandLayout(mode);

  if (colors.length !== layout.length) {
    return fail<ResistorSuccess>(
      RESISTOR_ERROR.BAND_COUNT_MISMATCH,
      `${mode} bantlı direnç için ${layout.length} renk seçilmelidir.`,
    );
  }

  // Validate every band against the colours allowed at its position.
  for (let i = 0; i < layout.length; i++) {
    const kind = layout[i];
    const color = colors[i];
    if (!validColorsFor(kind).includes(color)) {
      const name = COLOR_NAME_TR[color] ?? String(color);
      return fail<ResistorSuccess>(
        RESISTOR_ERROR.INVALID_COLOR,
        `${name} rengi ${KIND_LABEL_TR[kind].toLowerCase()} bandı için geçerli değil.`,
      );
    }
  }

  // Layout guarantees: digit bands first, then multiplier, then tolerance.
  const digitColors = colors.slice(0, mode === 5 ? 3 : 2);
  const multColor = colors[mode === 5 ? 3 : 2];
  const tolColor = colors[mode === 5 ? 4 : 3];

  const significand = digitColors.reduce(
    (acc, c) => acc * 10 + DIGIT_VALUE[c as keyof typeof DIGIT_VALUE],
    0,
  );
  const exp = MULTIPLIER_EXP[multColor as keyof typeof MULTIPLIER_EXP];
  const tolerancePercent = TOLERANCE_PERCENT[tolColor as keyof typeof TOLERANCE_PERCENT];

  const resistanceOhms = significand * Math.pow(10, exp);
  const minOhms = resistanceOhms * (1 - tolerancePercent / 100);
  const maxOhms = resistanceOhms * (1 + tolerancePercent / 100);

  if (
    ![resistanceOhms, minOhms, maxOhms].every(Number.isFinite) ||
    resistanceOhms < 0
  ) {
    return fail<ResistorSuccess>(
      RESISTOR_ERROR.RESULT_OUT_OF_RANGE,
      'Hesaplanan değerler sayısal olarak geçerli aralığın dışına çıktı.',
    );
  }

  const digitDetail = digitColors
    .map((c) => `${COLOR_NAME_TR[c]} (${DIGIT_VALUE[c as keyof typeof DIGIT_VALUE]})`)
    .join(', ');

  const steps: string[] = [
    `Rakamlar: ${digitDetail} = ${significand}`,
    `Çarpan: ${COLOR_NAME_TR[multColor]} = ×10^${exp} (×${fmt(Math.pow(10, exp))})`,
    `Direnç: ${significand} × ${fmt(Math.pow(10, exp))} = ${formatResistance(resistanceOhms)}`,
    `Tolerans: ${COLOR_NAME_TR[tolColor]} = ±%${fmt(tolerancePercent)}`,
    `Aralık: ${formatResistance(minOhms)} – ${formatResistance(maxOhms)}`,
  ];

  return {
    ok: true,
    resistanceOhms,
    tolerancePercent,
    displayValue: formatResistance(resistanceOhms),
    minOhms,
    maxOhms,
    steps,
  };
}

/** Registry metadata for the resistor colour-code calculator. */
export const resistorColorMeta: Calculator = {
  id: 'direnc-renk-kodu',
  slug: 'direnc-renk-kodu-hesaplayici',
  categoryId: 'electrical',
  title: 'Direnç Renk Kodu Hesaplayıcı',
  description:
    'Direncin renk bantlarını seçerek direnç değerini ve toleransını bulun (4 ve 5 bantlı).',
  formula: 'R = (rakamlar) × 10^çarpan',
  keywords: [
    'direnç renk kodu',
    'direnç renk kodu hesaplama',
    'renk kodu okuma',
    '4 bant direnç',
    '5 bant direnç',
  ],
  relatedTools: ['led-direnci', 'ohms-law'],
  faq: [
    {
      question: 'Direnç renk kodu nasıl okunur?',
      answer:
        'Renkli bantlar soldan sağa okunur. 4 bantlı dirençte ilk iki bant rakamları, üçüncü bant çarpanı (10’un kuvveti), dördüncü bant toleransı verir. Örneğin sarı-mor-kırmızı-altın = 47 × 100 = 4700 Ω (4,7 kΩ) ±%5. 5 bantlı dirençte ilk üç bant rakam, dördüncü çarpan, beşinci toleranstır.',
    },
    {
      question: '4 bant ve 5 bant direnç farkı nedir?',
      answer:
        '4 bantlı direnç iki anlamlı rakam kullanır (±%5/±%10 gibi geniş toleranslar), 5 bantlı direnç üç anlamlı rakam kullanır ve daha hassas (±%1, ±%0,5 gibi) değerler için kullanılır. 5 bantlı dirençler genellikle hassas/ölçüm devrelerinde tercih edilir.',
    },
  ],
};
