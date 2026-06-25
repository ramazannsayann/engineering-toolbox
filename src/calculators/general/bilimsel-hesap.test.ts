import { describe, it, expect } from 'vitest';
import { create, all } from 'mathjs';
import {
  evaluateExpression,
  differentiate,
  integrateDefinite,
  bilimselHesapMeta,
  SCI_ERROR,
  type AngleMode,
} from './bilimsel-hesap';

const tmath = create(all, {});

function evalOk(expr: string, mode: AngleMode = 'deg') {
  const r = evaluateExpression(expr, mode);
  if (!r.ok) throw new Error(`expected ok for "${expr}", got ${r.error.code}`);
  return r;
}
function evalErr(expr: string, mode: AngleMode = 'deg'): string {
  const r = evaluateExpression(expr, mode);
  expect(r.ok).toBe(false);
  if (r.ok) return '';
  return r.error.code;
}
/** Numerically evaluate the returned derivative string at a point. */
function derivAt(expr: string, x: number): number {
  const r = differentiate(expr);
  if (!r.ok) throw new Error(`expected ok deriv for "${expr}", got ${r.error.code}`);
  return Number(tmath.evaluate(r.derivative, { x }));
}

describe('evaluateExpression — arithmetic & precedence', () => {
  it('respects operator precedence and parentheses', () => {
    expect(evalOk('2+3*4').resultRaw).toBe(14);
    expect(evalOk('(2+3)*4').resultRaw).toBe(20);
    expect(evalOk('2^10').resultRaw).toBe(1024);
    expect(evalOk('2+3*4').result).toBe('14');
  });
});

describe('evaluateExpression — DEG mode trig', () => {
  it('forward trig take degrees', () => {
    expect(evalOk('sin(30)').resultRaw).toBeCloseTo(0.5, 10);
    expect(evalOk('cos(60)').resultRaw).toBeCloseTo(0.5, 10);
    expect(evalOk('tan(45)').resultRaw).toBeCloseTo(1, 10);
    expect(evalOk('sin(30)').result).toBe('0.5');
    expect(evalOk('tan(45)').result).toBe('1');
  });
  it('inverse trig RETURN degrees', () => {
    expect(evalOk('atan(1)').resultRaw).toBeCloseTo(45, 10);
    expect(evalOk('asin(0.5)').resultRaw).toBeCloseTo(30, 10);
  });
});

describe('evaluateExpression — RAD mode', () => {
  it('trig take radians in RAD mode', () => {
    expect(evalOk('sin(pi/6)', 'rad').resultRaw).toBeCloseTo(0.5, 10);
    expect(evalOk('atan(1)', 'rad').resultRaw).toBeCloseTo(Math.PI / 4, 9); // ≈0.785398
  });
});

describe('evaluateExpression — logs, roots, factorial, exp', () => {
  it('ln natural / log base-10 / log base-b', () => {
    expect(evalOk('log(1000)').resultRaw).toBeCloseTo(3, 12);
    expect(evalOk('log(100)').resultRaw).toBeCloseTo(2, 12);
    expect(evalOk('ln(e)').resultRaw).toBeCloseTo(1, 12);
    expect(evalOk('log(8, 2)').resultRaw).toBeCloseTo(3, 12);
  });
  it('roots / factorial / exp', () => {
    expect(evalOk('sqrt(2)').resultRaw).toBeCloseTo(Math.SQRT2, 9); // ≈1.414214
    expect(evalOk('cbrt(27)').resultRaw).toBeCloseTo(3, 12);
    expect(evalOk('5!').resultRaw).toBe(120);
    expect(evalOk('exp(1)').resultRaw).toBeCloseTo(Math.E, 9); // ≈2.718282
  });
});

describe('evaluateExpression — complex numbers', () => {
  it('abs is magnitude; arg returns degrees in DEG mode', () => {
    expect(evalOk('abs(3+4i)').resultRaw).toBe(5);
    expect(evalOk('arg(1+1i)').resultRaw).toBeCloseTo(45, 10);
    expect(evalOk('arg(0+1i)').resultRaw).toBeCloseTo(90, 10);
  });
  it('complex results format as "a + bi"', () => {
    expect(evalOk('2+3i').result).toBe('2 + 3i');
    expect(evalOk('sqrt(-1)').result).toBe('i');
  });
});

describe('evaluateExpression — errors (never throws)', () => {
  it('empty / syntax / unknown function / undefined result', () => {
    expect(evalErr('')).toBe(SCI_ERROR.EMPTY);
    expect(evalErr('2++')).toBe(SCI_ERROR.PARSE);
    expect(evalErr('sin(')).toBe(SCI_ERROR.PARSE);
    expect(evalErr('foo(2)')).toBe(SCI_ERROR.PARSE);
    expect(evalErr('1/0')).toBe(SCI_ERROR.UNDEFINED);
    expect(evalErr('0/0')).toBe(SCI_ERROR.UNDEFINED);
  });
});

describe('differentiate — verified by numeric evaluation', () => {
  it('d/dx x^2 = 2x', () => {
    expect(derivAt('x^2', 3)).toBeCloseTo(6, 9);
    expect(derivAt('x^2', 5)).toBeCloseTo(10, 9);
  });
  it('d/dx sin(x) = cos(x) (radians)', () => {
    expect(derivAt('sin(x)', 0)).toBeCloseTo(1, 9); // cos(0)
  });
  it('d/dx (x^3 + 2x) = 3x^2 + 2', () => {
    expect(derivAt('x^3+2*x', 2)).toBeCloseTo(14, 9);
  });
  it('d/dx ln(x) = 1/x', () => {
    expect(derivAt('ln(x)', 1)).toBeCloseTo(1, 9);
    expect(derivAt('ln(x)', 2)).toBeCloseTo(0.5, 9);
  });
  it('errors on empty / garbage', () => {
    const e = differentiate('');
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.error.code).toBe(SCI_ERROR.EMPTY);
    const g = differentiate(')(+');
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.error.code).toBe(SCI_ERROR.DERIVATIVE);
  });
});

describe('integrateDefinite — composite Simpson', () => {
  const val = (r: ReturnType<typeof integrateDefinite>): number => {
    if (!r.ok) throw new Error(`expected ok integral, got ${r.error.code}`);
    return Number(r.value);
  };
  it('∫ x^2 dx [0,1] = 1/3', () => {
    expect(val(integrateDefinite('x^2', 0, 1))).toBeCloseTo(1 / 3, 6);
  });
  it('∫ sin(x) dx [0,π] = 2 (radians)', () => {
    expect(val(integrateDefinite('sin(x)', 0, Math.PI))).toBeCloseTo(2, 5);
  });
  it('∫ 1/x dx [1,e] = 1', () => {
    expect(val(integrateDefinite('1/x', 1, Math.E))).toBeCloseTo(1, 4);
  });
  it('∫ x dx [0,2] = 2 ; ∫ 1 dx [0,5] = 5', () => {
    expect(val(integrateDefinite('x', 0, 2))).toBeCloseTo(2, 9);
    expect(val(integrateDefinite('1', 0, 5))).toBeCloseTo(5, 9);
  });
  it('a == b → 0', () => {
    const r = integrateDefinite('x^2', 3, 3);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number(r.value)).toBe(0);
  });
  it('reversed bounds negate: ∫ x dx [2,0] = -2', () => {
    expect(val(integrateDefinite('x', 2, 0))).toBeCloseTo(-2, 9);
  });
  it('divergent integrand (1/x crossing 0) → note, not a bogus number', () => {
    const r = integrateDefinite('1/x', -1, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe(SCI_ERROR.DIVERGENT);
  });
  it('errors on empty / bad bounds / bad function', () => {
    const empty = integrateDefinite('', 0, 1);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.code).toBe(SCI_ERROR.EMPTY);
    const bounds = integrateDefinite('x^2', NaN, 1);
    expect(bounds.ok).toBe(false);
    if (!bounds.ok) expect(bounds.error.code).toBe(SCI_ERROR.BOUNDS);
    const bad = integrateDefinite(')(', 0, 1);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe(SCI_ERROR.COMPILE);
  });
});

describe('metadata', () => {
  it('exposes the expected registry metadata', () => {
    expect(bilimselHesapMeta.id).toBe('bilimsel-hesap-makinesi');
    expect(bilimselHesapMeta.slug).toBe('bilimsel-hesap-makinesi');
    expect(bilimselHesapMeta.categoryId).toBe('general');
    expect(bilimselHesapMeta.formula).toBeUndefined();
    expect(bilimselHesapMeta.faq?.length).toBe(2);
  });
});
