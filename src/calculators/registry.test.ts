import { describe, it, expect } from 'vitest';
import {
  getAllCalculators,
  getCalculatorById,
  getCalculatorBySlug,
  getCalculatorsByCategory,
} from './registry';

describe('calculator registry', () => {
  it('includes Ohm’s Law in getAllCalculators', () => {
    expect(getAllCalculators().some((c) => c.id === 'ohms-law')).toBe(true);
  });

  it('finds Ohm’s Law by slug', () => {
    expect(getCalculatorBySlug('ohm-yasasi-hesaplayici')?.id).toBe('ohms-law');
  });

  it('finds Ohm’s Law by id', () => {
    expect(getCalculatorById('ohms-law')?.slug).toBe('ohm-yasasi-hesaplayici');
  });

  it('lists Ohm’s Law under the electrical category', () => {
    const list = getCalculatorsByCategory('electrical');
    expect(list.some((c) => c.id === 'ohms-law')).toBe(true);
  });

  it('returns undefined / empty for unknown lookups', () => {
    expect(getCalculatorBySlug('yok')).toBeUndefined();
    expect(getCalculatorById('yok')).toBeUndefined();
    expect(getCalculatorsByCategory('yok')).toEqual([]);
  });

  it('returns a defensive copy from getAllCalculators', () => {
    const a = getAllCalculators();
    a.push({
      id: 'x',
      slug: 'x',
      categoryId: 'x',
      title: 'x',
      description: 'x',
      formula: 'x',
      keywords: [],
      relatedTools: [],
    });
    expect(getAllCalculators().some((c) => c.id === 'x')).toBe(false);
  });
});

// Compile-time contract guard — NEVER executed (would mutate shared metadata at
// runtime). `npm run typecheck` enforces that Calculator metadata is readonly:
// if a future change drops `readonly`, the @ts-expect-error directives become
// unused and typecheck fails.
function _readonlyMetadataContract(): void {
  const [calc] = getAllCalculators();
  if (!calc) return;
  // @ts-expect-error Calculator.title is readonly
  calc.title = 'changed';
  // @ts-expect-error Calculator.keywords is a readonly array
  calc.keywords.push('extra');
}
void _readonlyMetadataContract;
