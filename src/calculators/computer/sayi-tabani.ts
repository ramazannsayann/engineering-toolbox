/**
 * Number base converter (Sayı Tabanı Dönüştürücü) — pure logic.
 *
 * Converts a NON-NEGATIVE INTEGER between binary, octal, decimal and
 * hexadecimal. Uses BigInt throughout so arbitrarily large values convert with
 * NO precision loss (unlike parseInt / Number). The input is parsed MANUALLY
 * digit-by-digit (BigInt has no arbitrary-radix string parser), validating each
 * character against the source base. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

/** The four supported bases. */
export type NumberBase = 2 | 8 | 10 | 16;

/** Base options for the UI dropdown (single source of truth). */
export const NUMBER_BASES = [
  { base: 2, label: 'İkilik (2)' },
  { base: 8, label: 'Sekizlik (8)' },
  { base: 10, label: 'Onluk (10)' },
  { base: 16, label: 'Onaltılık (16)' },
] as const satisfies readonly { base: NumberBase; label: string }[];

export interface NumberBaseInput {
  /** The number as typed by the user (any case for hex). */
  value: string;
  /** The base the value is written in. */
  fromBase: NumberBase;
}

/** One output row: a base, its Turkish label, and the converted value string. */
export interface BaseRow {
  readonly base: NumberBase;
  readonly label: string;
  readonly value: string;
}

export interface NumberBaseSuccess {
  /** The value rendered in all four bases (ascending base order). */
  readonly rows: readonly BaseRow[];
  /** Number of bits = length of the binary representation. */
  readonly bitLength: number;
}

export type NumberBaseResult = CalcResult<NumberBaseSuccess>;

export const NUMBER_BASE_ERROR = {
  /** Empty/whitespace-only input. */
  INVALID_INPUT: 'INVALID_INPUT',
  /** A character is not a legal digit for the source base. */
  INVALID_DIGIT: 'INVALID_DIGIT',
  /** A leading '-' or a '.'/',' (negatives & fractions are out of scope). */
  NEGATIVE_OR_FRACTION: 'NEGATIVE_OR_FRACTION',
  /** fromBase is not one of 2/8/10/16. */
  INVALID_BASE: 'INVALID_BASE',
  /** Pathologically long input. */
  TOO_LONG: 'TOO_LONG',
} as const;

/** Guard against pathological inputs (still allows huge legitimate numbers). */
const MAX_INPUT_LENGTH = 10000;

const BASE_LABEL: Record<NumberBase, string> = {
  2: 'İkilik',
  8: 'Sekizlik',
  10: 'Onluk',
  16: 'Onaltılık',
};

const INVALID_DIGIT_MESSAGE: Record<NumberBase, string> = {
  2: 'İkilik tabanda yalnızca 0 ve 1 kullanılabilir.',
  8: 'Sekizlik tabanda yalnızca 0-7 kullanılabilir.',
  10: 'Onluk tabanda yalnızca 0-9 kullanılabilir.',
  16: 'Onaltılık tabanda 0-9 ve A-F kullanılabilir.',
};

function isNumberBase(value: number): value is NumberBase {
  return value === 2 || value === 8 || value === 10 || value === 16;
}

/** Map a single character to its digit value, or -1 if it is not a digit. */
function digitValue(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 65 && code <= 70) return code - 55; // A-F
  if (code >= 97 && code <= 102) return code - 87; // a-f
  return -1;
}

/**
 * Convert a non-negative integer between bases. Pure and total — returns a
 * failure object (never throws) for any invalid input.
 */
export function convertNumberBase(input: NumberBaseInput): NumberBaseResult {
  const fromBase = input.fromBase;
  if (!isNumberBase(fromBase)) {
    return fail<NumberBaseSuccess>(
      NUMBER_BASE_ERROR.INVALID_BASE,
      'Geçersiz taban. Taban 2, 8, 10 veya 16 olmalıdır.',
    );
  }

  const trimmed = (input.value ?? '').trim();

  if (trimmed.length === 0) {
    return fail<NumberBaseSuccess>(NUMBER_BASE_ERROR.INVALID_INPUT, 'Bir sayı girin.');
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return fail<NumberBaseSuccess>(
      NUMBER_BASE_ERROR.TOO_LONG,
      'Girilen sayı çok uzun. Lütfen daha kısa bir değer girin.',
    );
  }
  if (trimmed.includes('-') || trimmed.includes('.') || trimmed.includes(',')) {
    return fail<NumberBaseSuccess>(
      NUMBER_BASE_ERROR.NEGATIVE_OR_FRACTION,
      'Yalnızca negatif olmayan tam sayılar desteklenir.',
    );
  }

  const baseBig = BigInt(fromBase);
  let acc = 0n;
  for (const ch of trimmed) {
    const d = digitValue(ch);
    if (d < 0 || d >= fromBase) {
      return fail<NumberBaseSuccess>(
        NUMBER_BASE_ERROR.INVALID_DIGIT,
        INVALID_DIGIT_MESSAGE[fromBase],
      );
    }
    acc = acc * baseBig + BigInt(d);
  }

  const binary = acc.toString(2);
  const rows: BaseRow[] = [
    { base: 2, label: BASE_LABEL[2], value: binary },
    { base: 8, label: BASE_LABEL[8], value: acc.toString(8) },
    { base: 10, label: BASE_LABEL[10], value: acc.toString(10) },
    { base: 16, label: BASE_LABEL[16], value: acc.toString(16).toUpperCase() },
  ];

  return { ok: true, rows, bitLength: binary.length };
}

/** Registry metadata for the number base converter. */
export const sayiTabaniMeta: Calculator = {
  id: 'sayi-tabani',
  slug: 'sayi-tabani-donusturucu',
  categoryId: 'computer',
  title: 'Sayı Tabanı Dönüştürücü',
  description:
    'Bir sayıyı ikilik, sekizlik, onluk ve onaltılık tabanlar arasında anında dönüştürün.',
  keywords: [
    'sayı tabanı dönüştürücü',
    'ikilik onluk dönüşüm',
    'hex to decimal',
    'binary to decimal',
    'onaltılık dönüştürme',
    'taban çevirme',
  ],
  relatedTools: ['veri-boyutu', 'renk-donusturucu'],
  faq: [
    {
      question: 'Sayı tabanı (binary, hex) nedir?',
      answer:
        'Sayı tabanı, bir sayının kaç farklı rakamla yazıldığını belirtir. Onluk (decimal) tabanda 0-9 arası 10 rakam vardır; ikilik (binary) tabanda yalnızca 0 ve 1; onaltılık (hex) tabanda 0-9 ve A-F olmak üzere 16 sembol kullanılır. Aynı sayı farklı tabanlarda farklı görünür ama değeri değişmez (örneğin onluk 255 = ikilik 11111111 = onaltılık FF).',
    },
    {
      question: 'Onaltılık (hex) sayılar nerede kullanılır?',
      answer:
        'Onaltılık sistem, ikilik verileri kısa ve okunabilir biçimde göstermek için yazılımda yaygındır: renk kodları (#FF8800), bellek adresleri, MAC adresleri, bayt değerleri ve hata kodları çoğunlukla hex yazılır. Bir hex basamağı tam olarak 4 bit’e (yarım bayt) karşılık geldiği için ikilik ↔ onaltılık dönüşümü çok kolaydır.',
    },
  ],
};
