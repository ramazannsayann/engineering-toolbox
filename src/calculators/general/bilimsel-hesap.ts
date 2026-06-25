/**
 * Scientific calculator (Bilimsel Hesap Makinesi) — pure logic.
 *
 * Three pure functions over mathjs: expression evaluation (with DEG/RAD modes
 * and calculator-style ln/log conventions, plus complex numbers), symbolic
 * differentiation, and a numerical definite integral (composite Simpson).
 *
 * mathjs is a pure math library (no React/Astro/DOM), so this engine stays
 * framework-agnostic and node-testable. SECURITY: all evaluation goes through
 * mathjs's parser/evaluator — JavaScript `eval()` is NEVER used.
 *
 * Conventions mapped to match engineering calculators:
 *  - `ln(x)` = natural log; `log(x)` = base-10; `log(x, b)` = base b.
 *  - DEG mode: trig take degrees; inverse/angle functions (asin/acos/atan/atan2,
 *    complex arg) RETURN degrees. Calculus (derivative/integral) is always in
 *    radians — independent of the DEG/RAD toggle.
 */
import { create, all, type EvalFunction } from 'mathjs';
import { fail, type Calculator, type CalcResult } from '../types';

const math = create(all, {});

const RAD_PER_DEG = Math.PI / 180;
const DEG_PER_RAD = 180 / Math.PI;

export type AngleMode = 'deg' | 'rad';

export const SCI_ERROR = {
  EMPTY: 'EMPTY',
  PARSE: 'PARSE',
  UNDEFINED: 'UNDEFINED',
  DERIVATIVE: 'DERIVATIVE',
  BOUNDS: 'BOUNDS',
  COMPILE: 'COMPILE',
  DIVERGENT: 'DIVERGENT',
} as const;

export interface EvaluateSuccess {
  /** Clean display string, e.g. "0.5" or "2 + 3i". */
  readonly result: string;
  /** Raw value: a number when numeric, otherwise the display string. */
  readonly resultRaw: number | string;
}
export interface DifferentiateSuccess {
  readonly derivative: string;
}
export interface IntegrateSuccess {
  readonly value: string;
}

/**
 * Build the evaluation scope. Always remaps ln/log to the calculator convention;
 * in DEG mode also wraps the angle functions so degrees go in and come out.
 *
 * NOTE: the wrapper params are typed `number` to satisfy mathjs's overloads —
 * angles are real. mathjs is polymorphic at runtime, so complex arguments still
 * flow through correctly (e.g. arg(z) of a Complex); that is just not reflected
 * in the static types here.
 */
function buildScope(angleMode: AngleMode): Record<string, unknown> {
  const scope: Record<string, unknown> = {
    // ln = natural (mathjs `log` is natural); log = base-10, or base-b with 2 args.
    ln: (x: number) => math.log(x),
    log: (x: number, base?: number) => (base === undefined ? math.log10(x) : math.log(x, base)),
  };
  if (angleMode === 'deg') {
    scope.sin = (x: number) => math.sin(math.multiply(x, RAD_PER_DEG));
    scope.cos = (x: number) => math.cos(math.multiply(x, RAD_PER_DEG));
    scope.tan = (x: number) => math.tan(math.multiply(x, RAD_PER_DEG));
    scope.asin = (x: number) => math.multiply(math.asin(x), DEG_PER_RAD);
    scope.acos = (x: number) => math.multiply(math.acos(x), DEG_PER_RAD);
    scope.atan = (x: number) => math.multiply(math.atan(x), DEG_PER_RAD);
    scope.atan2 = (y: number, x: number) => math.multiply(math.atan2(y, x), DEG_PER_RAD);
    scope.arg = (z: number) => math.multiply(math.arg(z), DEG_PER_RAD);
  }
  return scope;
}

/** Clean display string for any mathjs result (numbers, complex, …). */
function formatResult(value: unknown): string {
  return math.format(value, { precision: 12 });
}

/** True for ±Infinity / NaN numbers and complex values with non-finite parts. */
function isNonFinite(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (value && typeof value === 'object') {
    const c = value as { re?: unknown; im?: unknown };
    if (typeof c.re === 'number' && typeof c.im === 'number') {
      return !Number.isFinite(c.re) || !Number.isFinite(c.im);
    }
  }
  return false;
}

/**
 * Evaluate an expression. Pure and total — returns a failure object (never
 * throws) for empty input, parse/eval errors, or undefined results.
 */
export function evaluateExpression(expr: string, angleMode: AngleMode): CalcResult<EvaluateSuccess> {
  const trimmed = expr.trim();
  if (trimmed === '') {
    return fail<EvaluateSuccess>(SCI_ERROR.EMPTY, 'Bir ifade girin.');
  }

  let value: unknown;
  try {
    value = math.evaluate(trimmed, buildScope(angleMode));
  } catch {
    return fail<EvaluateSuccess>(SCI_ERROR.PARSE, 'Geçersiz ifade. Sözdizimini kontrol edin.');
  }

  if (typeof value === 'function' || value === undefined || value === null) {
    return fail<EvaluateSuccess>(SCI_ERROR.PARSE, 'Geçersiz ifade. Sözdizimini kontrol edin.');
  }
  if (isNonFinite(value)) {
    return fail<EvaluateSuccess>(SCI_ERROR.UNDEFINED, 'Tanımsız sonuç (ör. sıfıra bölme).');
  }

  const result = formatResult(value);
  const resultRaw = typeof value === 'number' ? value : result;
  return { ok: true, result, resultRaw };
}

// ── Calculus user↔native name mapping (ln↔log, log↔log10) ─────────────────────
// Single-pass swaps (no placeholder): user ln↔mathjs-native log (natural),
// user log↔mathjs-native log10 (base-10). The calculator's ln/log convention is
// thus consistent across evaluation, derivative, and integral.

/** User convention → mathjs-native (for symbolic derivative input). */
function toNative(expr: string): string {
  return expr.replace(/\b(ln|log)\s*\(/g, (_m, name: string) =>
    name === 'ln' ? 'log(' : 'log10(',
  );
}

/** mathjs-native → user convention (for derivative display). */
function toUser(expr: string): string {
  return expr.replace(/\b(log10|log)\s*\(/g, (_m, name: string) =>
    name === 'log10' ? 'log(' : 'ln(',
  );
}

/**
 * Symbolic derivative w.r.t. `variable` (default 'x'). Calculus is in radians,
 * independent of the DEG/RAD toggle. Pure and total.
 */
export function differentiate(expr: string, variable = 'x'): CalcResult<DifferentiateSuccess> {
  const trimmed = expr.trim();
  if (trimmed === '') {
    return fail<DifferentiateSuccess>(SCI_ERROR.EMPTY, 'Bir ifade girin.');
  }
  try {
    const node = math.derivative(toNative(trimmed), variable);
    return { ok: true, derivative: toUser(node.toString()) };
  } catch {
    return fail<DifferentiateSuccess>(SCI_ERROR.DERIVATIVE, 'Türevi alınamadı. İfadeyi kontrol edin.');
  }
}

/** Number of (even) Simpson sub-intervals. */
const SIMPSON_N = 1000;

/**
 * Numerical definite integral ∫ₐᵇ f dx via composite Simpson's rule. Radians.
 * Handles a>b (sign) and a==b (→0); returns a clear note when the integrand is
 * non-finite at a sample point (e.g. 1/x crossing 0). Pure and total.
 */
export function integrateDefinite(
  expr: string,
  a: number,
  b: number,
  variable = 'x',
): CalcResult<IntegrateSuccess> {
  const trimmed = expr.trim();
  if (trimmed === '') {
    return fail<IntegrateSuccess>(SCI_ERROR.EMPTY, 'Bir ifade girin.');
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return fail<IntegrateSuccess>(SCI_ERROR.BOUNDS, 'Alt ve üst sınır geçerli sayılar olmalı.');
  }

  let node: EvalFunction;
  try {
    node = math.compile(trimmed);
  } catch {
    return fail<IntegrateSuccess>(SCI_ERROR.COMPILE, 'Geçersiz fonksiyon.');
  }

  if (a === b) {
    return { ok: true, value: '0' };
  }

  const scope = buildScope('rad'); // ln/log convention; trig in radians
  const sign = a < b ? 1 : -1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const h = (hi - lo) / SIMPSON_N;

  let bad = false;
  const fval = (x: number): number => {
    let v: unknown;
    try {
      v = node.evaluate({ ...scope, [variable]: x });
    } catch {
      bad = true;
      return 0;
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) bad = true;
    return n;
  };

  let sum = fval(lo) + fval(hi);
  for (let i = 1; i < SIMPSON_N; i++) {
    const x = lo + i * h;
    sum += (i % 2 === 1 ? 4 : 2) * fval(x);
  }

  if (bad) {
    return fail<IntegrateSuccess>(SCI_ERROR.DIVERGENT, 'İntegral bu aralıkta tanımsız/yakınsamıyor.');
  }

  const integral = (sign * (sum * h)) / 3;
  if (!Number.isFinite(integral)) {
    return fail<IntegrateSuccess>(SCI_ERROR.DIVERGENT, 'İntegral bu aralıkta tanımsız/yakınsamıyor.');
  }

  return { ok: true, value: formatResult(integral) };
}

/** Registry metadata for the scientific calculator. */
export const bilimselHesapMeta: Calculator = {
  id: 'bilimsel-hesap-makinesi',
  slug: 'bilimsel-hesap-makinesi',
  categoryId: 'general',
  title: 'Bilimsel Hesap Makinesi',
  description:
    'Trigonometri, logaritma, üs, kök, faktöriyel, kompleks sayılar; türev ve belirli integral. Mühendisler için gelişmiş hesap makinesi.',
  keywords: [
    'bilimsel hesap makinesi',
    'online hesap makinesi',
    'türev hesaplama',
    'integral hesaplama',
    'trigonometri hesaplama',
    'kompleks sayı hesaplama',
  ],
  relatedTools: ['yuzde-hesaplama', 'sayi-tabani', 'sicaklik-donusturucu'],
  faq: [
    {
      question: 'Bilimsel hesap makinesi hangi işlemleri yapar?',
      answer:
        'Dört işlem ve parantezlerin yanı sıra üs (^), kök (sqrt, cbrt, nthRoot), faktöriyel (!), trigonometri (sin, cos, tan ve ters fonksiyonları), logaritma (doğal ln ve 10 tabanlı log), üstel (exp) ve kompleks sayı işlemlerini (i, abs, arg, conj) destekler. Ayrıca bir fonksiyonun türevini (sembolik) ve belirli integralini (sayısal) hesaplayabilir. Açı modu derece (DEG) veya radyan (RAD) seçilebilir.',
    },
    {
      question: 'İntegral nasıl hesaplanır?',
      answer:
        'Bu araç belirli integrali (alt ve üst sınır arasında) Simpson kuralıyla sayısal olarak hesaplar; sembolik (belirsiz) integral kapsanmaz. Türev ise sembolik olarak alınır. Önemli not: türev ve integral her zaman radyan tabanlıdır (DEG/RAD anahtarından bağımsızdır), çünkü kalkülüs radyan ile tanımlıdır.',
    },
  ],
};
