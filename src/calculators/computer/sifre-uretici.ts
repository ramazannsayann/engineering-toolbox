/**
 * Password generator — pure, deterministic STRUCTURE (the randomness lives in
 * the island via crypto.getRandomValues). The generator takes an INJECTED
 * unbiased `randomInt` so it is fully reproducible/unit-testable; the island
 * supplies a crypto-backed, rejection-sampled implementation. No React/Astro/DOM
 * imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const DIGITS = '0123456789';
/** Safe symbol set: no quotes, backslash, space or other shell/markup-risky chars. */
export const SYMBOLS = '!@#$%^&*()-_=+[]{}';

export const PASSWORD_LENGTH_MIN = 4;
export const PASSWORD_LENGTH_MAX = 128;

export interface PasswordOptions {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
}

export interface PasswordSuccess {
  readonly password: string;
  readonly poolSize: number;
}

export type PasswordResult = CalcResult<PasswordSuccess>;

/** Unbiased integer source: returns an integer in [0, maxExclusive). */
export type RandomInt = (maxExclusive: number) => number;

export const PASSWORD_ERROR = {
  /** No character set enabled. */
  NO_SET: 'NO_SET',
  /** length not an integer within [4, 128]. */
  LENGTH_RANGE: 'LENGTH_RANGE',
  /** A built password failed its own length check (defensive). */
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
} as const;

export interface CharPool {
  readonly pool: string;
  /** The enabled sets, in order — used to guarantee one char from each. */
  readonly sets: readonly string[];
}

/**
 * Validate options and build the combined character pool + the list of enabled
 * sets. Pure and total — returns a failure for an out-of-range length or when no
 * set is enabled.
 */
export function buildCharPool(options: PasswordOptions): CalcResult<CharPool> {
  if (
    !Number.isInteger(options.length) ||
    options.length < PASSWORD_LENGTH_MIN ||
    options.length > PASSWORD_LENGTH_MAX
  ) {
    return fail<CharPool>(
      PASSWORD_ERROR.LENGTH_RANGE,
      `Şifre uzunluğu ${PASSWORD_LENGTH_MIN} ile ${PASSWORD_LENGTH_MAX} arasında bir tam sayı olmalıdır.`,
    );
  }

  const sets: string[] = [];
  if (options.upper) sets.push(UPPER);
  if (options.lower) sets.push(LOWER);
  if (options.digits) sets.push(DIGITS);
  if (options.symbols) sets.push(SYMBOLS);

  if (sets.length === 0) {
    return fail<CharPool>(PASSWORD_ERROR.NO_SET, 'En az bir karakter kümesi seçin.');
  }

  return { ok: true, pool: sets.join(''), sets };
}

/**
 * Generate a password of the requested length from the enabled sets, guaranteeing
 * at least one character from EACH enabled set (place one of each, fill the rest
 * from the full pool, then Fisher-Yates shuffle). Pure and total — uses only the
 * injected `randomInt`. (length ≥ 4 ≥ max sets, so "one of each" always fits.)
 */
export function generatePassword(
  options: PasswordOptions,
  randomInt: RandomInt,
): PasswordResult {
  const poolResult = buildCharPool(options);
  if (!poolResult.ok) return poolResult;

  const { pool, sets } = poolResult;
  const length = options.length;
  const chars: string[] = [];

  // One guaranteed char from each enabled set.
  for (const set of sets) {
    chars.push(set[randomInt(set.length)]);
  }
  // Fill the remainder from the full pool.
  for (let i = chars.length; i < length; i++) {
    chars.push(pool[randomInt(pool.length)]);
  }
  // Fisher-Yates shuffle so the guaranteed chars aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  const password = chars.join('');
  if (password.length !== length) {
    return fail<PasswordSuccess>(
      PASSWORD_ERROR.RESULT_OUT_OF_RANGE,
      'Şifre üretilemedi; lütfen tekrar deneyin.',
    );
  }

  return { ok: true, password, poolSize: pool.length };
}

/** Registry metadata for the password generator. */
export const sifreUreticiMeta: Calculator = {
  id: 'sifre-uretici',
  slug: 'sifre-uretici',
  categoryId: 'computer',
  title: 'Şifre Üreteci',
  description:
    'Güçlü, rastgele şifreler oluşturun; uzunluk ve karakter türlerini seçin. Şifre tarayıcınızda üretilir.',
  keywords: [
    'şifre üretici',
    'rastgele şifre',
    'güçlü şifre oluşturma',
    'parola üretici',
    'password generator',
  ],
  relatedTools: ['uuid-uretici', 'hash', 'base64'],
  faq: [
    {
      question: 'Güçlü bir şifre nasıl olmalı?',
      answer:
        'Güçlü bir şifre yeterince uzun (en az 12-16 karakter) olmalı ve büyük harf, küçük harf, rakam ve sembol gibi farklı karakter türlerini içermelidir. Tahmin edilebilir kelimeler, doğum tarihleri veya klavye dizilimleri (123456, qwerty) kullanılmamalıdır. Her hesap için farklı bir şifre ve mümkünse bir şifre yöneticisi tercih edin.',
    },
    {
      question: 'Bu şifreler güvenli/rastgele mi?',
      answer:
        'Evet. Şifreler tarayıcınızın kriptografik rastgelelik kaynağı (crypto.getRandomValues) ile üretilir; modulo yanlılığını önlemek için reddetme örneklemesi kullanılır. Üretim tamamen cihazınızda yapılır — şifre hiçbir sunucuya gönderilmez, saklanmaz veya kaydedilmez.',
    },
  ],
};
