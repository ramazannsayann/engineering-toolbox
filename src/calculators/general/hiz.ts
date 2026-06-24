/**
 * Speed converter (Hız) — pure logic. Thin wrapper over the shared linear
 * engine; factors are in METERS PER SECOND (the base unit). km/h and knot use
 * exact fractions (1000/3600, 1852/3600) so anchors stay clean. No
 * React/Astro/DOM imports.
 */
import { convertLinear, type LinearUnit, type LinearResult } from './linear-convert';
import type { Calculator } from '../types';

/** Supported speed units; factorToBase is in METERS PER SECOND. */
export const SPEED_UNITS = [
  { id: 'mps', label: 'Metre/saniye (m/s)', factorToBase: 1 },
  { id: 'kmh', label: 'Kilometre/saat (km/s)', factorToBase: 1000 / 3600 },
  { id: 'mph', label: 'Mil/saat (mph)', factorToBase: 0.44704 },
  { id: 'fps', label: 'Fit/saniye (ft/s)', factorToBase: 0.3048 },
  { id: 'knot', label: 'Knot (knot)', factorToBase: 1852 / 3600 },
] as const satisfies readonly LinearUnit[];

/** Convert a speed value from `fromUnitId` into every other speed unit. */
export function convertSpeed(value: number, fromUnitId: string): LinearResult {
  return convertLinear(value, fromUnitId, SPEED_UNITS);
}

/** Registry metadata for the speed converter. */
export const hizMeta: Calculator = {
  id: 'hiz-donusturucu',
  slug: 'hiz-donusturucu',
  categoryId: 'general',
  title: 'Hız Dönüştürücü',
  description:
    'km/saat, m/saniye, mph ve knot gibi hız birimleri arasında dönüşüm yapın.',
  keywords: [
    'hız dönüştürücü',
    'km saat mph çevirme',
    'knot km çevirme',
    'mph kmh dönüşümü',
    'hız birimleri',
    'm/s km/s',
  ],
  relatedTools: ['uzunluk-donusturucu'],
  faq: [
    {
      question: '1 km/saat kaç m/saniyedir?',
      answer:
        '1 km/saat yaklaşık 0,2778 m/saniyedir (tam olarak 1000/3600 = 0,27778 m/s). Tersine, 1 m/saniye 3,6 km/saate eşittir. m/saniyeden km/saate geçmek için 3,6 ile çarpmanız yeterlidir.',
    },
    {
      question: '1 knot kaç km/saattir?',
      answer:
        '1 knot tam olarak 1,852 km/saattir. Knot, denizcilik ve havacılıkta kullanılan hız birimidir ve saatte 1 deniz mili (1852 m) hıza karşılık gelir.',
    },
  ],
};
