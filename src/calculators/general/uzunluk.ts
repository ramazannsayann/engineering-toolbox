/**
 * Length converter (Uzunluk) — pure logic. A thin wrapper over the shared
 * linear-conversion engine: all factors are in METERS (the base unit). No
 * React/Astro/DOM imports.
 */
import { convertLinear, type LinearUnit, type LinearResult } from './linear-convert';
import type { Calculator } from '../types';

/** Supported length units; factorToBase is in METERS. */
export const LENGTH_UNITS = [
  { id: 'mm', label: 'Milimetre (mm)', factorToBase: 0.001 },
  { id: 'cm', label: 'Santimetre (cm)', factorToBase: 0.01 },
  { id: 'm', label: 'Metre (m)', factorToBase: 1 },
  { id: 'km', label: 'Kilometre (km)', factorToBase: 1000 },
  { id: 'inch', label: 'İnç (inç)', factorToBase: 0.0254 },
  { id: 'ft', label: 'Fit (ft)', factorToBase: 0.3048 },
  { id: 'yd', label: 'Yarda (yd)', factorToBase: 0.9144 },
  { id: 'mile', label: 'Mil (mil)', factorToBase: 1609.344 },
  { id: 'nm', label: 'Deniz mili (nm)', factorToBase: 1852 },
] as const satisfies readonly LinearUnit[];

/** Convert a length value from `fromUnitId` into every other length unit. */
export function convertLength(value: number, fromUnitId: string): LinearResult {
  return convertLinear(value, fromUnitId, LENGTH_UNITS);
}

/** Registry metadata for the length converter. */
export const uzunlukMeta: Calculator = {
  id: 'uzunluk-donusturucu',
  slug: 'uzunluk-donusturucu',
  categoryId: 'general',
  title: 'Uzunluk Dönüştürücü',
  description:
    'Metre, santimetre, kilometre ile inç, fit, mil gibi uzunluk birimleri arasında dönüşüm yapın.',
  keywords: [
    'uzunluk dönüştürücü',
    'cm inç çevirme',
    'metre feet çevirme',
    'km mil dönüşümü',
    'uzunluk birimleri',
    'mesafe çevirici',
  ],
  relatedTools: ['agirlik-donusturucu', 'alan-donusturucu', 'hacim-donusturucu'],
  faq: [
    {
      question: '1 metre kaç santimetredir?',
      answer:
        '1 metre 100 santimetreye eşittir (1 m = 100 cm). Metre, Uluslararası Birim Sistemi’nde (SI) uzunluğun temel birimidir; santimetre ise metrenin yüzde biridir (1 cm = 0,01 m). Ayrıca 1 metre = 1000 milimetredir.',
    },
    {
      question: "1 inç kaç cm'dir?",
      answer:
        '1 inç tam olarak 2,54 santimetredir (1 inç = 2,54 cm). Bu tanım uluslararası anlaşmayla sabittir. Buradan 1 fit = 12 inç = 30,48 cm ve 1 yarda = 3 fit = 91,44 cm elde edilir.',
    },
  ],
};
