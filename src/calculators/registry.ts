/**
 * Calculator registry.
 *
 * Architecture rule: this file holds calculator METADATA ONLY — it is used for
 * listing, routing, and SEO. It must NOT import or bundle calculation
 * functions. UI/islands import each calculator's pure `solve*` function
 * directly from its own module (see src/calculators/<category>/<slug>.ts).
 *
 * To register a new calculator: import only its `*Meta` object and add it to
 * the array below.
 */
import type { Calculator } from './types';
import { ohmsLawMeta } from './electrical/ohms-law';

export type { Calculator } from './types';

const calculators: Calculator[] = [ohmsLawMeta];

/**
 * All registered calculators. Returns a shallow copy of the array; each
 * `Calculator` is `readonly`, so callers can neither resize the registry nor
 * mutate the shared metadata objects.
 */
export function getAllCalculators(): Calculator[] {
  return [...calculators];
}

/** Look up a calculator by its URL slug. */
export function getCalculatorBySlug(slug: string): Calculator | undefined {
  return calculators.find((calculator) => calculator.slug === slug);
}

/** Look up a calculator by its stable internal id. */
export function getCalculatorById(id: string): Calculator | undefined {
  return calculators.find((calculator) => calculator.id === id);
}

/** All calculators belonging to a given category id. */
export function getCalculatorsByCategory(categoryId: string): Calculator[] {
  return calculators.filter(
    (calculator) => calculator.categoryId === categoryId,
  );
}
