/**
 * URL (percent) encode / decode — pure logic.
 *
 * Two targets, kept distinct:
 *   • component → encodeURIComponent / decodeURIComponent — escapes EVERY
 *     reserved char (correct for a single query-parameter value). DEFAULT.
 *   • full      → encodeURI / decodeURI — preserves URL-structural chars
 *     (/ ? : @ & = + $ #) so a whole URL stays usable.
 *
 * decodeURI(Component) throws a URIError on malformed percent sequences (%ZZ,
 * a lone %, %A) — wrapped in try/catch so the engine never throws. All four
 * functions are standard JS globals (Node + browser), so this stays pure and
 * unit-testable. No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export type UrlMode = 'encode' | 'decode';
export type UrlTarget = 'component' | 'full';

/** Mode options for the UI. */
export const URL_MODES = [
  { id: 'encode', label: 'Encode' },
  { id: 'decode', label: 'Decode' },
] as const satisfies readonly { id: UrlMode; label: string }[];

/** Target options for the UI. */
export const URL_TARGETS = [
  { id: 'component', label: 'Bileşen (component)' },
  { id: 'full', label: 'Tam URL' },
] as const satisfies readonly { id: UrlTarget; label: string }[];

export interface UrlInput {
  value: string;
  mode: UrlMode;
  target: UrlTarget;
}

export interface UrlSuccess {
  readonly output: string;
  readonly mode: UrlMode;
  readonly target: UrlTarget;
}

export type UrlResult = CalcResult<UrlSuccess>;

export const URL_ENCODE_ERROR = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  /** Malformed percent sequence on decode (or a lone surrogate on encode). */
  INVALID_ENCODING: 'INVALID_ENCODING',
  INVALID_MODE: 'INVALID_MODE',
} as const;

/**
 * Encode or decode by mode + target. Pure and total — returns a failure object
 * (never throws) for empty/invalid input.
 */
export function convertUrl(input: UrlInput): UrlResult {
  if (input.value === '') {
    return fail<UrlSuccess>(URL_ENCODE_ERROR.EMPTY_INPUT, 'Dönüştürülecek metni girin.');
  }

  const { mode, target, value } = input;
  try {
    let output: string;
    if (mode === 'encode') {
      output = target === 'full' ? encodeURI(value) : encodeURIComponent(value);
    } else if (mode === 'decode') {
      output = target === 'full' ? decodeURI(value) : decodeURIComponent(value);
    } else {
      return fail<UrlSuccess>(URL_ENCODE_ERROR.INVALID_MODE, 'Geçersiz mod.');
    }
    return { ok: true, output, mode, target };
  } catch {
    // decodeURI/decodeURIComponent throw URIError on malformed % sequences.
    return fail<UrlSuccess>(
      URL_ENCODE_ERROR.INVALID_ENCODING,
      'Geçerli bir URL kodlu metin girin (hatalı % dizisi).',
    );
  }
}

/** Registry metadata for the URL encode/decode tool. */
export const urlEncodeMeta: Calculator = {
  id: 'url-encode',
  slug: 'url-encode-decode',
  categoryId: 'computer',
  title: 'URL Encode / Decode',
  description:
    'Metni URL (yüzde) kodlamasına çevirin veya URL kodlu metni geri çözün.',
  keywords: [
    'url encode',
    'url decode',
    'url kodlama',
    'yüzde kodlama',
    'percent encoding',
    'url çözücü',
  ],
  relatedTools: ['base64', 'sayi-tabani', 'ip-subnet'],
  faq: [
    {
      question: 'URL kodlama (percent encoding) nedir?',
      answer:
        'URL kodlama, bir adreste (URL) doğrudan kullanılamayan karakterleri “%” işareti ve onların onaltılık (hex) byte karşılığıyla değiştiren yöntemdir. Örneğin boşluk %20, Türkçe “ü” harfi %C3%BC olur. Böylece boşluk, &, ?, Türkçe karakterler gibi özel karakterler bağlantıyı bozmadan güvenle taşınabilir.',
    },
    {
      question: 'encodeURIComponent ve encodeURI farkı nedir?',
      answer:
        'encodeURIComponent bir URL’nin tek bir parçasını (örneğin bir sorgu parametresinin değerini) kodlar ve “/ ? : @ & = +” gibi yapısal karakterleri de kaçışlar. encodeURI ise tüm bir URL’yi kodlar ve bu yapısal karakterleri korur. Bir parametre değeri için “Bileşen”, tam bir adres için “Tam URL” seçeneğini kullanın.',
    },
  ],
};
