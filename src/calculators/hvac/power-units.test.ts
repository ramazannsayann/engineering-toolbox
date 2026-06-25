import { describe, it, expect } from 'vitest';
import { powerRows, KW_TO_BTU_PER_H, KW_TO_KCAL_PER_H } from './power-units';

function rowValue(rows: { label: string; value: string }[], label: string): string {
  const r = rows.find((x) => x.label === label);
  if (!r) throw new Error(`no row "${label}"`);
  return r.value;
}

describe('power-units', () => {
  it('exposes the conversion constants', () => {
    expect(KW_TO_BTU_PER_H).toBe(3412.142);
    expect(KW_TO_KCAL_PER_H).toBe(859.845);
  });

  it('1 kW → 3412.142 BTU/h, 859.845 kcal/h (raw)', () => {
    expect(1 * KW_TO_BTU_PER_H).toBeCloseTo(3412.142, 3);
    expect(1 * KW_TO_KCAL_PER_H).toBeCloseTo(859.845, 3);
  });

  it('powerRows(1) → kW, BTU/saat, kcal/saat rows', () => {
    const rows = powerRows(1);
    expect(rows.map((r) => r.label)).toEqual(['Kilovat (kW)', 'BTU/saat', 'kcal/saat']);
    expect(rowValue(rows, 'Kilovat (kW)')).toBe('1');
    expect(rowValue(rows, 'BTU/saat')).toBe('3412.14'); // 6 sig figs
    expect(rowValue(rows, 'kcal/saat')).toBe('859.845');
  });

  it('powerRows(0) → all "0"', () => {
    for (const r of powerRows(0)) expect(r.value).toBe('0');
  });

  it('accepts an injected formatter', () => {
    const rows = powerRows(2, (n) => n.toFixed(1));
    expect(rowValue(rows, 'Kilovat (kW)')).toBe('2.0');
  });
});
