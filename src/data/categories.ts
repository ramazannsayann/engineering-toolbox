/**
 * Top-level calculator categories.
 *
 * The category `id` stays English (matches Calculator.categoryId in code); the
 * `slug` is the Turkish URL segment. Only "electrical" is populated in Phase 0;
 * the rest render as "Yakında" until Phase 1 adds tools.
 */

export interface Category {
  /** Stable, globally-unique identifier (matches Calculator.categoryId). */
  readonly id: string;
  /** Turkish URL slug for the category landing page, e.g. "elektrik". */
  readonly slug: string;
  /** Human-readable Turkish name. */
  readonly title: string;
  /** One-line Turkish summary for listings and meta descriptions. */
  readonly description: string;
  /** Icon id resolved by CategoryIcon.astro (bolt/airflow/heat/convert/chip). */
  readonly icon: string;
}

export const categories: readonly Category[] = [
  {
    id: 'electrical',
    slug: 'elektrik',
    title: 'Elektrik & Güç',
    description: 'Ohm, güç, kablo kesiti, gerilim düşümü.',
    icon: 'bolt',
  },
  {
    id: 'hvac',
    slug: 'hvac',
    title: 'HVAC & Tesisat',
    description: 'Isıtma yükü, debi, basınç kaybı.',
    icon: 'airflow',
  },
  {
    id: 'thermal',
    slug: 'isi',
    title: 'Isı & Akış',
    description: 'İletim, taşınım, ısı geçişi, akış.',
    icon: 'heat',
  },
  {
    id: 'general',
    slug: 'genel',
    title: 'Genel & Dönüşüm',
    description: 'Birim, ölçü ve mertebe dönüşümleri.',
    icon: 'convert',
  },
  {
    id: 'computer',
    slug: 'bilgisayar',
    title: 'Bilgisayar & Yazılım',
    description: 'IP/subnet, veri boyutu, sayı tabanı.',
    icon: 'chip',
  },
];

/** Look up a category by its Turkish URL slug. */
export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

/** Look up a category by its stable English id. */
export function getCategoryById(id: string): Category | undefined {
  return categories.find((category) => category.id === id);
}
