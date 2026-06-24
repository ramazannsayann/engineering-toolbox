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
import { powerTriangleMeta } from './electrical/guc-ucgeni';
import { powerMeta } from './electrical/guc-hesabi';
import { currentMeta } from './electrical/amper-hesabi';
import { compensationMeta } from './electrical/kompanzasyon';
import { voltageDropMeta } from './electrical/gerilim-dusumu';
import { cableSizingMeta } from './electrical/kablo-kesiti';
import { motorCurrentMeta } from './electrical/motor-akimi';
import { transformerSizingMeta } from './electrical/trafo-boyutlandirma';
import { shortCircuitMeta } from './electrical/kisa-devre-akimi';
import { resistorColorMeta } from './electrical/direnc-renk-kodu';
import { ledResistorMeta } from './electrical/led-direnci';
import { timerMeta } from './electrical/555-timer';
import { sayiTabaniMeta } from './computer/sayi-tabani';
import { veriBoyutuMeta } from './computer/veri-boyutu';
import { ipSubnetMeta } from './computer/ip-subnet';
import { renkDonusturucuMeta } from './computer/renk-donusturucu';
import { base64Meta } from './computer/base64';

export type { Calculator } from './types';

const calculators: Calculator[] = [
  ohmsLawMeta,
  powerTriangleMeta,
  powerMeta,
  currentMeta,
  compensationMeta,
  voltageDropMeta,
  cableSizingMeta,
  motorCurrentMeta,
  transformerSizingMeta,
  shortCircuitMeta,
  resistorColorMeta,
  ledResistorMeta,
  timerMeta,
  sayiTabaniMeta,
  veriBoyutuMeta,
  ipSubnetMeta,
  renkDonusturucuMeta,
  base64Meta,
];

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
