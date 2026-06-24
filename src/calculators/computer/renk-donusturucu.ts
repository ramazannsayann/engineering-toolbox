/**
 * Color converter (Renk Dönüştürücü) — pure logic.
 *
 * Converts between HEX, RGB and HSL. Everything is derived from ONE canonical
 * RGB ({r,g,b} integers 0–255) parsed from the input, so the three outputs and
 * the preview swatch never drift from round-tripping. Opaque colors only — no
 * alpha (RGBA/HSLA/#RRGGBBAA). No React/Astro/DOM imports.
 */
import { fail, type Calculator, type CalcResult } from '../types';

export type ColorFormat = 'hex' | 'rgb' | 'hsl';

/** Format options for the UI dropdown (single source of truth). */
export const COLOR_FORMATS = [
  { id: 'hex', label: 'HEX' },
  { id: 'rgb', label: 'RGB' },
  { id: 'hsl', label: 'HSL' },
] as const satisfies readonly { id: ColorFormat; label: string }[];

export interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ColorRow {
  readonly label: string;
  readonly value: string;
}

export interface ColorSuccess {
  /** Canonical RGB — drives the swatch in the UI. */
  readonly rgb: RGB;
  /** Canonical HEX (#RRGGBB uppercase) — also the swatch fill. */
  readonly hex: string;
  readonly rows: readonly ColorRow[];
}

export type ColorResult = CalcResult<ColorSuccess>;

export interface ColorInput {
  value: string;
  fromFormat: ColorFormat;
}

export const COLOR_ERROR = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_HEX: 'INVALID_HEX',
  INVALID_RGB: 'INVALID_RGB',
  INVALID_HSL: 'INVALID_HSL',
  INVALID_FORMAT: 'INVALID_FORMAT',
} as const;

/** Parse #RRGGBB / RRGGBB / #RGB / RGB (any case), expanding shorthand. */
function parseHex(raw: string): RGB | null {
  let s = raw.trim();
  if (s.startsWith('#')) s = s.slice(1);
  s = s.toUpperCase();
  if (!/^[0-9A-F]+$/.test(s)) return null;
  if (s.length === 3) {
    s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  } else if (s.length !== 6) {
    return null;
  }
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/** Parse "r, g, b" or "rgb(r, g, b)" with integer components 0–255. */
function parseRgb(raw: string): RGB | null {
  let s = raw.trim().toLowerCase();
  if (s.startsWith('rgb')) {
    s = s.replace(/^rgb\s*\(/, '').replace(/\)$/, '');
  }
  const parts = s.split(',').map((p) => p.trim());
  if (parts.length !== 3) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null; // integers only, no sign/decimal
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    nums.push(n);
  }
  return { r: nums[0], g: nums[1], b: nums[2] };
}

/** Parse "h, s%, l%" / "h, s, l" / "hsl(...)" then convert HSL → RGB. */
function parseHsl(raw: string): RGB | null {
  let s = raw.trim().toLowerCase();
  if (s.startsWith('hsl')) {
    s = s.replace(/^hsl\s*\(/, '').replace(/\)$/, '');
  }
  const parts = s.split(',').map((p) => p.trim().replace(/%$/, '').trim());
  if (parts.length !== 3) return null;
  const h = Number(parts[0]);
  const sat = Number(parts[1]);
  const lig = Number(parts[2]);
  if (![h, sat, lig].every(Number.isFinite)) return null;
  if (h < 0 || h > 360 || sat < 0 || sat > 100 || lig < 0 || lig > 100) return null;
  return hslToRgb(h, sat, lig);
}

/** Standard HSL → RGB; rounds each channel to the nearest integer 0–255. */
function hslToRgb(h: number, s: number, l: number): RGB {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hh = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ln - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) {
    rp = c;
    gp = x;
  } else if (hh < 120) {
    rp = x;
    gp = c;
  } else if (hh < 180) {
    gp = c;
    bp = x;
  } else if (hh < 240) {
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

/** Standard RGB → HSL; H in 0–360, S/L in integer percents. */
function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const chroma = max - min;
    s = chroma / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / chroma) % 6;
    else if (max === g) h = (b - r) / chroma + 2;
    else h = (r - g) / chroma + 4;
    h *= 60;
    h = ((h % 360) + 360) % 360; // normalize negative hues into [0, 360)
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** RGB → #RRGGBB uppercase. */
function rgbToHex(rgb: RGB): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
}

/**
 * Convert a color between HEX/RGB/HSL. Pure and total — returns a failure object
 * (never throws) for any invalid input.
 */
export function convertColor(input: ColorInput): ColorResult {
  const raw = (input.value ?? '').trim();
  if (raw === '') {
    return fail<ColorSuccess>(COLOR_ERROR.EMPTY_INPUT, 'Bir renk değeri girin.');
  }

  let rgb: RGB | null = null;
  let errorCode = '';
  let errorMessage = '';
  if (input.fromFormat === 'hex') {
    rgb = parseHex(raw);
    errorCode = COLOR_ERROR.INVALID_HEX;
    errorMessage = 'Geçerli bir HEX rengi girin (örn. #3498DB).';
  } else if (input.fromFormat === 'rgb') {
    rgb = parseRgb(raw);
    errorCode = COLOR_ERROR.INVALID_RGB;
    errorMessage = 'RGB değerleri 0–255 arasında olmalı (örn. 52, 152, 219).';
  } else if (input.fromFormat === 'hsl') {
    rgb = parseHsl(raw);
    errorCode = COLOR_ERROR.INVALID_HSL;
    errorMessage = 'HSL değerleri geçersiz (H 0–360, S/L 0–100; örn. 204, 70%, 53%).';
  } else {
    return fail<ColorSuccess>(COLOR_ERROR.INVALID_FORMAT, 'Geçersiz renk formatı.');
  }

  if (!rgb) {
    return fail<ColorSuccess>(errorCode, errorMessage);
  }

  const hex = rgbToHex(rgb);
  const { h, s, l } = rgbToHsl(rgb);
  const rows: ColorRow[] = [
    { label: 'HEX', value: hex },
    { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    { label: 'HSL', value: `hsl(${h}, ${s}%, ${l}%)` },
  ];

  return { ok: true, rgb, hex, rows };
}

/** Registry metadata for the color converter. */
export const renkDonusturucuMeta: Calculator = {
  id: 'renk-donusturucu',
  slug: 'renk-donusturucu',
  categoryId: 'computer',
  title: 'Renk Dönüştürücü',
  description:
    'HEX, RGB ve HSL renk formatları arasında dönüşüm yapın ve rengi anında önizleyin.',
  keywords: [
    'renk dönüştürücü',
    'hex rgb dönüşümü',
    'rgb to hex',
    'hex to rgb',
    'hsl dönüştürme',
    'renk kodu çevirici',
  ],
  relatedTools: ['sayi-tabani', 'direnc-renk-kodu'],
  faq: [
    {
      question: 'HEX renk kodu nasıl okunur?',
      answer:
        'HEX kodu # işaretinden sonra altı onaltılık (0-9, A-F) basamaktan oluşur: ilk iki basamak kırmızı (R), sonraki iki yeşil (G), son iki mavi (B) bileşenini 0–255 aralığında belirtir. Örneğin #3498DB = R:52, G:152, B:219. Kısa yazım (#ABC), her basamağın ikiye katlanmış halidir (#AABBCC).',
    },
    {
      question: 'RGB ve HSL arasındaki fark nedir?',
      answer:
        'RGB rengi kırmızı, yeşil ve mavi ışık bileşenleriyle (her biri 0–255) tanımlar; ekranların çalışma biçimine yakındır. HSL ise rengi ton (H, 0–360°), doygunluk (S, %) ve parlaklık (L, %) ile tanımlar; bu, bir rengi sezgisel olarak ayarlamayı (daha açık/daha soluk yapmayı) kolaylaştırır. İkisi aynı rengi farklı biçimde ifade eder.',
    },
  ],
};
