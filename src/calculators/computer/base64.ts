/**
 * Base64 encode / decode (UTF-8 safe) — pure logic.
 *
 * Plain btoa/atob are Latin1-only and corrupt multibyte UTF-8 (ç, ş, ğ, ı, …,
 * emoji). This module bridges through bytes: text ⇄ UTF-8 bytes (TextEncoder/
 * TextDecoder, WHATWG globals available in Node 18+ AND browsers — NOT DOM) ⇄
 * Base64 (implemented manually over the standard alphabet, so it works in any
 * environment and avoids the `String.fromCharCode(...bytes)` call-stack limit on
 * large inputs). No React/Astro/DOM (document/window) imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export type Base64Mode = 'encode' | 'decode';

export interface Base64Input {
  value: string;
  mode: Base64Mode;
}

export interface Base64Success {
  readonly output: string;
  readonly mode: Base64Mode;
}

export type Base64Result = CalcResult<Base64Success>;

export const BASE64_ERROR = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_BASE64: 'INVALID_BASE64',
  INVALID_MODE: 'INVALID_MODE',
} as const;

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64_ALPHABET.length; i++) {
  B64_LOOKUP[B64_ALPHABET[i]] = i;
}

/** Encode raw bytes to a standard (padded) Base64 string. */
function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const has1 = i + 1 < bytes.length;
    const has2 = i + 2 < bytes.length;
    const b1 = has1 ? bytes[i + 1] : 0;
    const b2 = has2 ? bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += B64_ALPHABET[(triple >> 18) & 63];
    out += B64_ALPHABET[(triple >> 12) & 63];
    out += has1 ? B64_ALPHABET[(triple >> 6) & 63] : '=';
    out += has2 ? B64_ALPHABET[triple & 63] : '=';
  }
  return out;
}

/**
 * Decode a Base64 string to bytes, or null if it is not valid Base64. Whitespace
 * and newlines are ignored (lenient); the remaining text must be the standard
 * alphabet with optional trailing '='/'==' padding and a length multiple of 4.
 */
function base64ToBytes(input: string): Uint8Array | null {
  const s = input.replace(/\s+/g, '');
  if (s === '') return new Uint8Array(0);
  if (!/^[A-Za-z0-9+\/]*={0,2}$/.test(s)) return null;
  if (s.length % 4 !== 0) return null;

  const padding = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const byteLength = (s.length / 4) * 3 - padding;
  const bytes = new Uint8Array(byteLength);
  let j = 0;
  for (let i = 0; i < s.length; i += 4) {
    const c0 = B64_LOOKUP[s[i]];
    const c1 = B64_LOOKUP[s[i + 1]];
    const c2 = s[i + 2] === '=' ? 0 : B64_LOOKUP[s[i + 2]];
    const c3 = s[i + 3] === '=' ? 0 : B64_LOOKUP[s[i + 3]];
    const triple = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (j < byteLength) bytes[j++] = (triple >> 16) & 255;
    if (j < byteLength) bytes[j++] = (triple >> 8) & 255;
    if (j < byteLength) bytes[j++] = triple & 255;
  }
  return bytes;
}

/** Encode text → UTF-8-safe Base64. */
export function encodeBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

/** Decode Base64 → text (UTF-8). Throws if the input is not valid Base64. */
export function decodeBase64(b64: string): string {
  const bytes = base64ToBytes(b64);
  if (bytes === null) throw new Error('Geçersiz Base64 verisi.');
  return new TextDecoder().decode(bytes);
}

/**
 * Encode or decode by mode. Pure and total — returns a failure object (never
 * throws) for empty/invalid input.
 */
export function convertBase64(input: Base64Input): Base64Result {
  if (input.mode === 'encode') {
    if (input.value === '') {
      return fail<Base64Success>(BASE64_ERROR.EMPTY_INPUT, 'Dönüştürülecek metni girin.');
    }
    return { ok: true, output: encodeBase64(input.value), mode: 'encode' };
  }

  if (input.mode === 'decode') {
    if (input.value.replace(/\s+/g, '') === '') {
      return fail<Base64Success>(BASE64_ERROR.EMPTY_INPUT, 'Çözülecek Base64 metnini girin.');
    }
    const bytes = base64ToBytes(input.value);
    if (bytes === null) {
      return fail<Base64Success>(BASE64_ERROR.INVALID_BASE64, 'Geçerli bir Base64 metni girin.');
    }
    return { ok: true, output: new TextDecoder().decode(bytes), mode: 'decode' };
  }

  return fail<Base64Success>(BASE64_ERROR.INVALID_MODE, 'Geçersiz mod.');
}

/** Registry metadata for the Base64 tool. */
export const base64Meta: Calculator = {
  id: 'base64',
  slug: 'base64-encode-decode',
  categoryId: 'computer',
  title: 'Base64 Encode / Decode',
  description:
    'Metni Base64 formatına kodlayın veya Base64 metnini geri çözün (UTF-8, Türkçe karakter destekli).',
  keywords: [
    'base64 encode',
    'base64 decode',
    'base64 çevirici',
    'base64 kodlama',
    'metin base64',
  ],
  relatedTools: ['url-encode', 'hash', 'sayi-tabani'],
  faq: [
    {
      question: 'Base64 nedir, ne işe yarar?',
      answer:
        'Base64, ikili (binary) veriyi yalnızca 64 güvenli metin karakteri (A-Z, a-z, 0-9, + ve /) kullanarak metne dönüştüren bir kodlama yöntemidir. Görseller, dosyalar veya özel karakterler içeren metinler; e-posta, JSON, veri URI’leri gibi yalnızca metni güvenle taşıyabilen ortamlarda iletilirken Base64 ile kodlanır.',
    },
    {
      question: 'Base64 şifreleme midir?',
      answer:
        'Hayır. Base64 bir şifreleme (encryption) değil, bir kodlamadır (encoding). Hiçbir gizli anahtar kullanmaz ve herkes tarafından kolayca geri çözülebilir; bu nedenle güvenlik amacıyla kullanılmamalıdır. Yalnızca veriyi taşınabilir bir metin biçimine dönüştürür.',
    },
  ],
};
