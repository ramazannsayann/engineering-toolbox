/**
 * Volume converter (Hacim) — pure logic. Thin wrapper over the shared linear
 * engine; factors are in LITERS (the base unit). US (ABD) gallon/pint/cup are
 * used and labeled "ABD" to be unambiguous (imperial differs). No
 * React/Astro/DOM imports.
 */
import { convertLinear, type LinearUnit, type LinearResult } from './linear-convert';
import type { Calculator } from '../types';

/** Supported volume units; factorToBase is in LITERS. */
export const VOLUME_UNITS = [
  { id: 'ml', label: 'Mililitre (mL)', factorToBase: 0.001 },
  { id: 'cl', label: 'Santilitre (cL)', factorToBase: 0.01 },
  { id: 'l', label: 'Litre (L)', factorToBase: 1 },
  { id: 'm3', label: 'Metreküp (m³)', factorToBase: 1000 },
  { id: 'cm3', label: 'Santimetreküp (cm³)', factorToBase: 0.001 },
  { id: 'gal', label: 'ABD Galonu (gal)', factorToBase: 3.785411784 },
  { id: 'pint', label: 'ABD Pinti (pint)', factorToBase: 0.473176473 },
  { id: 'cup', label: 'ABD Su Bardağı (cup)', factorToBase: 0.2365882365 },
] as const satisfies readonly LinearUnit[];

/** Convert a volume value from `fromUnitId` into every other volume unit. */
export function convertVolume(value: number, fromUnitId: string): LinearResult {
  return convertLinear(value, fromUnitId, VOLUME_UNITS);
}

/** Registry metadata for the volume converter. */
export const hacimMeta: Calculator = {
  id: 'hacim-donusturucu',
  slug: 'hacim-donusturucu',
  categoryId: 'general',
  title: 'Hacim Dönüştürücü',
  description:
    'Litre, mililitre, metreküp ile ABD galonu gibi hacim birimleri arasında dönüşüm yapın.',
  keywords: [
    'hacim dönüştürücü',
    'litre galon çevirme',
    'metreküp litre',
    'ml litre dönüşümü',
    'hacim birimleri',
    'gallon litre',
  ],
  relatedTools: ['agirlik-donusturucu', 'uzunluk-donusturucu'],
  faq: [
    {
      question: '1 litre kaç mililitredir?',
      answer:
        '1 litre 1000 mililitredir (1 L = 1000 mL). Ayrıca 1 mililitre tam olarak 1 santimetreküpe (cm³) eşittir; yani 1 litre = 1000 cm³’tür.',
    },
    {
      question: '1 metreküp kaç litredir?',
      answer:
        '1 metreküp (m³) 1000 litredir. Metreküp büyük hacimleri (su deposu, beton, doğal gaz) ölçmekte kullanılır; 1 m³ = 1000 L = 1.000.000 mL’dir.',
    },
  ],
};
