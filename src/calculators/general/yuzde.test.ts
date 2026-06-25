import { describe, it, expect } from 'vitest';
import { convertPercentage, yuzdeMeta, YUZDE_ERROR, type YuzdeResult } from './yuzde';

function expectError(result: YuzdeResult, code: string): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
}

describe('convertPercentage — modes', () => {
  it("'of': 200, 15 → 30", () => {
    const r = convertPercentage({ mode: 'of', a: 200, b: 15 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result).toBeCloseTo(30, 9);
    if (r.ok) expect(r.steps.length).toBeGreaterThan(0);
  });

  it("'isWhatPercent': 50, 200 → 25(%)", () => {
    const r = convertPercentage({ mode: 'isWhatPercent', a: 50, b: 200 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result).toBeCloseTo(25, 9);
    if (r.ok) expect(r.unit).toBe('%');
  });

  it("'change': 100→150 → +50(%); 200→150 → −25(%)", () => {
    const up = convertPercentage({ mode: 'change', a: 100, b: 150 });
    expect(up.ok && up.result).toBeCloseTo(50, 9);
    if (up.ok) expect(up.resultLabel).toContain('artış');

    const down = convertPercentage({ mode: 'change', a: 200, b: 150 });
    expect(down.ok && down.result).toBeCloseTo(-25, 9);
    if (down.ok) expect(down.resultLabel).toContain('azalış');
  });

  it('allows negative values (change −100 → −50 → −50%)', () => {
    const r = convertPercentage({ mode: 'change', a: -100, b: -50 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.result).toBeCloseTo(-50, 9);
  });
});

describe('convertPercentage — errors', () => {
  it('isWhatPercent with b = 0 → division by zero', () => {
    expectError(convertPercentage({ mode: 'isWhatPercent', a: 50, b: 0 }), YUZDE_ERROR.DIVISION_BY_ZERO);
  });

  it('change with a = 0 → division by zero', () => {
    expectError(convertPercentage({ mode: 'change', a: 0, b: 50 }), YUZDE_ERROR.DIVISION_BY_ZERO);
  });

  it('non-finite inputs → error', () => {
    expectError(convertPercentage({ mode: 'of', a: NaN, b: 15 }), YUZDE_ERROR.INVALID_NUMBER);
    expectError(convertPercentage({ mode: 'of', a: 200, b: Infinity }), YUZDE_ERROR.INVALID_NUMBER);
  });
});

describe('yuzdeMeta', () => {
  it('exposes the expected registry metadata', () => {
    expect(yuzdeMeta.id).toBe('yuzde-hesaplama');
    expect(yuzdeMeta.categoryId).toBe('general');
    expect(yuzdeMeta.formula).toBeUndefined();
    expect(yuzdeMeta.faq?.length).toBe(2);
  });
});
