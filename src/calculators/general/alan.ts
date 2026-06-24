/**
 * Area converter (Alan) — pure logic. Thin wrapper over the shared linear
 * engine; factors are in SQUARE METERS (the base unit). No React/Astro/DOM
 * imports.
 */
import { convertLinear, type LinearUnit, type LinearResult } from './linear-convert';
import type { Calculator } from '../types';

/** Supported area units; factorToBase is in SQUARE METERS. */
export const AREA_UNITS = [
  { id: 'mm2', label: 'Milimetrekare (mm²)', factorToBase: 0.000001 },
  { id: 'cm2', label: 'Santimetrekare (cm²)', factorToBase: 0.0001 },
  { id: 'm2', label: 'Metrekare (m²)', factorToBase: 1 },
  { id: 'ha', label: 'Hektar (ha)', factorToBase: 10000 },
  { id: 'km2', label: 'Kilometrekare (km²)', factorToBase: 1000000 },
  { id: 'donum', label: 'Dönüm (dönüm)', factorToBase: 1000 },
  { id: 'akre', label: 'Akre (akre)', factorToBase: 4046.8564224 },
  { id: 'ft2', label: 'Ayakkare (ft²)', factorToBase: 0.09290304 },
  { id: 'inch2', label: 'İnçkare (inç²)', factorToBase: 0.00064516 },
] as const satisfies readonly LinearUnit[];

/** Convert an area value from `fromUnitId` into every other area unit. */
export function convertArea(value: number, fromUnitId: string): LinearResult {
  return convertLinear(value, fromUnitId, AREA_UNITS);
}

/** Registry metadata for the area converter. */
export const alanMeta: Calculator = {
  id: 'alan-donusturucu',
  slug: 'alan-donusturucu',
  categoryId: 'general',
  title: 'Alan Dönüştürücü',
  description:
    'Metrekare, kilometrekare, hektar, dönüm ile akre ve ayakkare gibi alan birimleri arasında dönüşüm yapın.',
  keywords: [
    'alan dönüştürücü',
    'metrekare dönüşümü',
    'dönüm hektar çevirme',
    'akre metrekare',
    'alan birimleri',
    'm2 ft2 çevirme',
  ],
  relatedTools: ['uzunluk-donusturucu', 'hacim-donusturucu'],
  faq: [
    {
      question: '1 dönüm kaç metrekaredir?',
      answer:
        '1 dönüm (yeni/metrik dönüm) 1000 metrekaredir. Buna göre 1 hektar = 10 dönüm = 10.000 m²’dir. Türkiye’de güncel olarak kullanılan dönüm 1000 m² olarak tanımlanır.',
    },
    {
      question: '1 hektar kaç dönümdür?',
      answer:
        '1 hektar 10 dönüme eşittir (1 ha = 10.000 m² = 10 dönüm). Hektar büyük arazileri ölçmekte kullanılan metrik bir alan birimidir; 1 kilometrekare ise 100 hektara (1.000.000 m²) denktir.',
    },
  ],
};
