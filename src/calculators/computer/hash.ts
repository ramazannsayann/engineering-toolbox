/**
 * Hash calculator — MD5 + SHA-1 / SHA-256 / SHA-512 of UTF-8 text.
 *
 * MD5 is computed by the project's pure-TS implementation (md5.ts, zero deps);
 * the SHA family uses Web Crypto `crypto.subtle.digest`, a standard global in
 * browsers (secure context) AND Node 18+ (`globalThis.crypto.subtle`) — so the
 * engine stays pure/testable with NO React/Astro/DOM (document/window) imports.
 * All output is lowercase hex.
 */
import { fail, type Calculator, type CalcResult } from '../types';
import { md5Bytes } from './md5';

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/** Algorithm list for the UI (also the row order). */
export const HASH_ALGORITHMS = [
  { id: 'md5', label: 'MD5' },
  { id: 'sha1', label: 'SHA-1' },
  { id: 'sha256', label: 'SHA-256' },
  { id: 'sha512', label: 'SHA-512' },
] as const satisfies readonly { id: HashAlgorithm; label: string }[];

export interface HashRow {
  readonly label: string;
  readonly value: string;
}

export interface HashSuccess {
  readonly rows: readonly HashRow[];
}

export type HashResult = CalcResult<HashSuccess>;

export const HASH_ERROR = {
  /** Web Crypto unavailable or a digest call failed. */
  CRYPTO_UNAVAILABLE: 'CRYPTO_UNAVAILABLE',
} as const;

/** ArrayBuffer → lowercase hex. */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

/**
 * Compute MD5, SHA-1, SHA-256 and SHA-512 of `text` at once. Pure and total —
 * resolves to a failure object (never rejects/throws) if Web Crypto is missing
 * or a digest fails. Empty input is valid (the empty-string hashes are useful
 * reference values).
 */
export async function computeHashes(text: string): Promise<HashResult> {
  const bytes = new TextEncoder().encode(text);
  const md5hex = md5Bytes(bytes);

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return fail<HashSuccess>(
      HASH_ERROR.CRYPTO_UNAVAILABLE,
      'Tarayıcınız SHA hesaplaması için gerekli kripto desteğini (Web Crypto) sağlamıyor.',
    );
  }

  try {
    const [sha1, sha256, sha512] = await Promise.all([
      subtle.digest('SHA-1', bytes),
      subtle.digest('SHA-256', bytes),
      subtle.digest('SHA-512', bytes),
    ]);
    return {
      ok: true,
      rows: [
        { label: 'MD5', value: md5hex },
        { label: 'SHA-1', value: bufferToHex(sha1) },
        { label: 'SHA-256', value: bufferToHex(sha256) },
        { label: 'SHA-512', value: bufferToHex(sha512) },
      ],
    };
  } catch {
    return fail<HashSuccess>(HASH_ERROR.CRYPTO_UNAVAILABLE, 'Hash hesaplanırken bir hata oluştu.');
  }
}

/** Registry metadata for the hash calculator. */
export const hashMeta: Calculator = {
  id: 'hash',
  slug: 'hash-hesaplayici',
  categoryId: 'computer',
  title: 'Hash Hesaplayıcı (MD5, SHA)',
  description:
    'Metnin MD5, SHA-1, SHA-256 ve SHA-512 özet (hash) değerlerini hesaplayın.',
  keywords: [
    'hash hesaplama',
    'md5 hesaplama',
    'sha256 hesaplama',
    'sha1 hash',
    'özet değeri',
    'checksum hesaplama',
  ],
  relatedTools: ['base64', 'url-encode'],
  faq: [
    {
      question: 'Hash (özet) nedir, ne işe yarar?',
      answer:
        'Hash (özet), herhangi bir uzunluktaki veriyi sabit uzunlukta, kendine özgü bir parmak izine dönüştüren tek yönlü bir fonksiyondur. Aynı girdi her zaman aynı özeti verir; girdideki en küçük değişiklik bile özeti tamamen değiştirir. Dosya bütünlüğünü doğrulama (checksum), veriyi karşılaştırma ve indeksleme gibi amaçlarla kullanılır. Özetten geriye doğru orijinal veriye ulaşılamaz.',
    },
    {
      question: 'MD5 ve SHA-1 güvenli midir?',
      answer:
        'Hayır. MD5 ve SHA-1 kriptografik olarak kırılmıştır (çakışma/collision saldırılarına açıktır) ve parola saklama, dijital imza gibi GÜVENLİK amaçları için KULLANILMAMALIDIR. Yalnızca güvenlik gerektirmeyen amaçlarda (dosya bütünlüğü kontrolü, eski sistemlerle uyumluluk) uygundur. Güvenlik gereken yerlerde SHA-256 veya SHA-512 tercih edilmelidir (parolalar için ayrıca bcrypt/Argon2 gibi özel algoritmalar).',
    },
  ],
};
