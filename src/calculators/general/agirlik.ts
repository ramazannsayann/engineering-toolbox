/**
 * Weight / mass converter (Ağırlık) — pure logic. Thin wrapper over the shared
 * linear-conversion engine; factors are in GRAMS (the base unit). No
 * React/Astro/DOM imports.
 */
import { convertLinear, type LinearUnit, type LinearResult } from './linear-convert';
import type { Calculator } from '../types';

/** Supported weight units; factorToBase is in GRAMS. */
export const WEIGHT_UNITS = [
  { id: 'mg', label: 'Miligram (mg)', factorToBase: 0.001 },
  { id: 'g', label: 'Gram (g)', factorToBase: 1 },
  { id: 'kg', label: 'Kilogram (kg)', factorToBase: 1000 },
  { id: 't', label: 'Ton (t)', factorToBase: 1000000 },
  { id: 'oz', label: 'Ons (oz)', factorToBase: 28.349523125 },
  { id: 'lb', label: 'Libre (lb)', factorToBase: 453.59237 },
] as const satisfies readonly LinearUnit[];

/** Convert a weight value from `fromUnitId` into every other weight unit. */
export function convertWeight(value: number, fromUnitId: string): LinearResult {
  return convertLinear(value, fromUnitId, WEIGHT_UNITS);
}

/** Registry metadata for the weight converter. */
export const agirlikMeta: Calculator = {
  id: 'agirlik-donusturucu',
  slug: 'agirlik-donusturucu',
  categoryId: 'general',
  title: 'Ağırlık Dönüştürücü',
  description:
    'Gram, kilogram, ton ile ons ve libre (lb) gibi ağırlık birimleri arasında dönüşüm yapın.',
  keywords: [
    'ağırlık dönüştürücü',
    'kg lb çevirme',
    'gram ons çevirme',
    'kilogram pound',
    'ağırlık birimleri',
    'kütle çevirici',
  ],
  relatedTools: ['uzunluk-donusturucu', 'hacim-donusturucu', 'alan-donusturucu'],
  faq: [
    {
      question: '1 kilogram kaç libredir (lb)?',
      answer:
        '1 kilogram yaklaşık 2,20462 libreye (pound) eşittir. Tersine, 1 libre tam olarak 0,45359237 kilogramdır. Kilogram metrik (SI) kütle birimi, libre (lb) ise İngiliz/Amerikan birim sisteminde kullanılan kütle birimidir.',
    },
    {
      question: '1 libre (lb) kaç kilogramdır?',
      answer:
        '1 libre (lb) tam olarak 0,45359237 kilogramdır (yaklaşık 453,6 gram). Ayrıca 1 libre = 16 ons (oz) olduğundan, 1 ons ≈ 28,35 grama denk gelir.',
    },
  ],
};
