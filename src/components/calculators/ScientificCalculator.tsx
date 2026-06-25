import { useRef, useState } from 'react';
import {
  evaluateExpression,
  differentiate,
  integrateDefinite,
  type AngleMode,
} from '../../calculators/general/bilimsel-hesap';
import SectionLabel from '../ui/SectionLabel';
import TextInput from '../ui/TextInput';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import { parseField } from './parse';

type Mode = 'hesap' | 'turev' | 'integral';

const MODES: { id: Mode; label: string }[] = [
  { id: 'hesap', label: 'Hesap Makinesi' },
  { id: 'turev', label: 'Türev' },
  { id: 'integral', label: 'İntegral' },
];

/** Function keys: insert `<name>(` and place the caret inside the parens. */
const FUNC_KEYS = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'exp'];

interface PadKey {
  label: string;
  /** Text inserted at the caret (defaults to label). */
  insert?: string;
  kind?: 'num' | 'op' | 'fn' | 'eq' | 'clear';
}

// Numeric / operator pad, laid out as a 5-column grid.
const PAD: PadKey[] = [
  { label: '(', kind: 'op' }, { label: ')', kind: 'op' }, { label: '^', kind: 'op' }, { label: '!', kind: 'op' }, { label: '⌫', kind: 'clear' },
  { label: '7', kind: 'num' }, { label: '8', kind: 'num' }, { label: '9', kind: 'num' }, { label: '÷', insert: '/', kind: 'op' }, { label: 'π', insert: 'pi', kind: 'op' },
  { label: '4', kind: 'num' }, { label: '5', kind: 'num' }, { label: '6', kind: 'num' }, { label: '×', insert: '*', kind: 'op' }, { label: 'e', kind: 'op' },
  { label: '1', kind: 'num' }, { label: '2', kind: 'num' }, { label: '3', kind: 'num' }, { label: '−', insert: '-', kind: 'op' }, { label: 'i', kind: 'op' },
  { label: '0', kind: 'num' }, { label: '.', kind: 'num' }, { label: 'AC', kind: 'clear' }, { label: '+', kind: 'op' }, { label: '=', kind: 'eq' },
];

const FUNCTION_REFERENCE: { sym: string; desc: string }[] = [
  { sym: '+ − * / ^', desc: 'dört işlem ve üs' },
  { sym: 'sin cos tan', desc: 'trigonometri (DEG/RAD)' },
  { sym: 'asin acos atan', desc: 'ters trigonometri' },
  { sym: 'sqrt cbrt nthRoot(x,n)', desc: 'kare/küp/n. dereceden kök' },
  { sym: 'ln(x) / log(x) / log(x,b)', desc: 'doğal / 10 tabanlı / b tabanlı log' },
  { sym: 'exp(x)  x!  abs(x)  mod(a,b)', desc: 'üstel, faktöriyel, mutlak değer, mod' },
  { sym: 'i  abs(z)  arg(z)  conj(z)', desc: 'kompleks sayılar (büyüklük, faz, eşlenik)' },
  { sym: 'pi  e', desc: 'sabitler' },
];

function keyClass(kind: PadKey['kind']): string {
  const base =
    'rounded-[10px] border py-3 font-mono text-[15px] transition select-none cursor-pointer active:scale-[0.97]';
  if (kind === 'eq') return `${base} btn-accent border-transparent`;
  if (kind === 'op' || kind === 'fn')
    return `${base} border-border-strong bg-surface-sunken text-accent hover:border-accent/50`;
  if (kind === 'clear')
    return `${base} border-border-strong bg-surface-sunken text-text-muted hover:border-accent/50`;
  return `${base} border-border-strong bg-surface text-text hover:border-accent/50`;
}

/**
 * Scientific calculator island. Three tabs (Hesap Makinesi / Türev / İntegral)
 * over the pure `bilimsel-hesap` engine (mathjs). The calculator has a typeable,
 * cursor-aware expression field plus a button pad, a DEG/RAD toggle, a live
 * result, and an in-state history. All math is delegated to the engine — the UI
 * never calls eval(). Inline Turkish errors; never crashes.
 */
export default function ScientificCalculator() {
  const [mode, setMode] = useState<Mode>('hesap');

  // Calculator state.
  const [expr, setExpr] = useState('');
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [calcError, setCalcError] = useState<string | null>(null);
  const exprRef = useRef<HTMLInputElement>(null);

  /** Update the expression and clear any stale "=" error. */
  function changeExpr(next: string): void {
    setExpr(next);
    setCalcError(null);
  }

  // Calculus state.
  const [dExpr, setDExpr] = useState('x^2');
  const [dVar, setDVar] = useState('x');
  const [iExpr, setIExpr] = useState('x^2');
  const [iA, setIA] = useState('0');
  const [iB, setIB] = useState('1');

  const evalResult = expr.trim() === '' ? null : evaluateExpression(expr, angleMode);

  function setCaret(pos: number): void {
    const el = exprRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function insert(token: string): void {
    const el = exprRef.current;
    const start = el?.selectionStart ?? expr.length;
    const end = el?.selectionEnd ?? expr.length;
    changeExpr(expr.slice(0, start) + token + expr.slice(end));
    setCaret(start + token.length);
  }

  function backspace(): void {
    const el = exprRef.current;
    const start = el?.selectionStart ?? expr.length;
    const end = el?.selectionEnd ?? expr.length;
    if (start === end) {
      if (start === 0) return;
      changeExpr(expr.slice(0, start - 1) + expr.slice(end));
      setCaret(start - 1);
    } else {
      changeExpr(expr.slice(0, start) + expr.slice(end));
      setCaret(start);
    }
  }

  function commit(): void {
    const r = evaluateExpression(expr, angleMode);
    if (r.ok) {
      setHistory((h) => [{ expr, result: r.result }, ...h].slice(0, 8));
      setCalcError(null);
    } else if (expr.trim() !== '') {
      setCalcError(r.error.message);
    }
  }

  function handleKey(key: PadKey): void {
    if (key.label === '=') {
      commit();
      return;
    }
    if (key.label === 'AC') {
      changeExpr('');
      setCaret(0);
      return;
    }
    if (key.label === '⌫') {
      backspace();
      return;
    }
    insert(key.insert ?? key.label);
  }

  // Derivative (live).
  const dResult = dExpr.trim() === '' ? null : differentiate(dExpr, dVar.trim() || 'x');
  // Integral (live).
  const aNum = parseField(iA);
  const bNum = parseField(iB);
  const iResult =
    iExpr.trim() === '' || iA.trim() === '' || iB.trim() === ''
      ? null
      : integrateDefinite(iExpr, aNum ?? NaN, bNum ?? NaN, 'x');

  return (
    <div className="flex flex-col gap-5">
      {/* Mode tabs */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-[10px] border px-4 py-2 text-[13px] transition select-none cursor-pointer ${
              mode === m.id
                ? 'border-accent/60 bg-surface-sunken text-accent'
                : 'border-border-strong bg-surface text-text-muted hover:border-accent/40'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'hesap' && (
        <div className="flex flex-col gap-4">
          {/* DEG/RAD toggle */}
          <div className="flex items-center justify-between">
            <SectionLabel>İfade</SectionLabel>
            <div className="flex overflow-hidden rounded-[9px] border border-border-strong">
              {(['deg', 'rad'] as AngleMode[]).map((am) => (
                <button
                  key={am}
                  type="button"
                  onClick={() => setAngleMode(am)}
                  className={`px-3 py-1.5 font-mono text-[12px] transition cursor-pointer ${
                    angleMode === am ? 'bg-accent/15 text-accent' : 'bg-surface text-text-muted hover:text-text'
                  }`}
                >
                  {am === 'deg' ? 'DEG' : 'RAD'}
                </button>
              ))}
            </div>
          </div>

          {/* Editable expression field */}
          <div className="field-card p-3.5">
            <input
              ref={exprRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="örn. sin(30) + sqrt(2)"
              className="w-full border-0 bg-transparent font-mono text-[20px] font-semibold tracking-[-0.01em] text-text outline-none placeholder:font-medium placeholder:text-text-faint"
              value={expr}
              onChange={(e) => changeExpr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
              }}
            />
            <div className="mt-2 min-h-[24px] text-right">
              {evalResult && evalResult.ok && (
                <span className="font-mono text-[22px] font-semibold text-accent">= {evalResult.result}</span>
              )}
            </div>
          </div>

          {calcError && (
            <p className="error-note" role="alert">
              {calcError}
            </p>
          )}

          {/* Function keys */}
          <div className="grid grid-cols-5 gap-2">
            {FUNC_KEYS.map((fn) => (
              <button
                key={fn}
                type="button"
                onClick={() => insert(fn === 'sqrt' ? 'sqrt(' : `${fn}(`)}
                className={keyClass('fn')}
              >
                {fn === 'sqrt' ? '√' : fn}
              </button>
            ))}
          </div>

          {/* Numeric / operator pad */}
          <div className="grid grid-cols-5 gap-2">
            {PAD.map((key) => (
              <button key={key.label} type="button" onClick={() => handleKey(key)} className={keyClass(key.kind)}>
                {key.label}
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <SectionLabel>Geçmiş</SectionLabel>
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-[12px] text-text-muted hover:text-text cursor-pointer"
                >
                  Temizle
                </button>
              </div>
              <div className="ui-card overflow-hidden">
                {history.map((h, index) => (
                  <button
                    key={`${h.expr}-${index}`}
                    type="button"
                    onClick={() => changeExpr(h.result)}
                    title="Sonucu ifadeye al"
                    className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-surface-sunken cursor-pointer${
                      index > 0 ? ' border-t border-hairline' : ''
                    }`}
                  >
                    <span className="truncate font-mono text-[12.5px] text-text-muted">{h.expr}</span>
                    <span className="shrink-0 font-mono text-[13px] text-text">= {h.result}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <details className="ui-card overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-[13px] text-text-muted select-none">
              Fonksiyonlar
            </summary>
            <div className="border-t border-hairline">
              {FUNCTION_REFERENCE.map((row) => (
                <div key={row.sym} className="flex flex-col gap-0.5 border-t border-hairline px-4 py-2.5 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="font-mono text-[12.5px] text-accent">{row.sym}</span>
                  <span className="text-[12px] text-text-muted">{row.desc}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {mode === 'turev' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
            <TextInput label="f(x)" value={dExpr} onChange={setDExpr} mono placeholder="örn. x^2 + sin(x)" />
            <TextInput label="Değişken" value={dVar} onChange={setDVar} mono placeholder="x" />
          </div>
          <Button variant="secondary" type="button" onClick={() => { setDExpr(''); setDVar('x'); }}>
            Temizle
          </Button>
          <p className="text-[12px] text-text-dim">Türev radyan tabanlıdır.</p>
          {dResult && dResult.ok && (
            <div className="result-card p-5">
              <SectionLabel tone="accent">Türev</SectionLabel>
              <p className="mt-3 font-mono text-[20px] font-semibold break-words text-accent">
                {dResult.derivative}
              </p>
            </div>
          )}
          {dResult && !dResult.ok && (
            <p className="error-note" role="alert">
              {dResult.error.message}
            </p>
          )}
        </div>
      )}

      {mode === 'integral' && (
        <div className="flex flex-col gap-4">
          <TextInput label="f(x)" value={iExpr} onChange={setIExpr} mono placeholder="örn. x^2" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Alt Sınır (a)" unit="" value={iA} onChange={setIA} />
            <NumberInput label="Üst Sınır (b)" unit="" value={iB} onChange={setIB} />
          </div>
          <Button variant="secondary" type="button" onClick={() => { setIExpr(''); setIA('0'); setIB('1'); }}>
            Temizle
          </Button>
          <p className="text-[12px] text-text-dim">Belirli integral sayısal olarak (radyan) hesaplanır.</p>
          {iResult && iResult.ok && (
            <div className="result-card p-5">
              <SectionLabel tone="accent">Belirli İntegral</SectionLabel>
              <p className="mt-3 font-mono text-[24px] font-semibold text-accent">{iResult.value}</p>
              <p className="mt-2 text-[12px] text-text-dim">
                ∫ f(x) dx, [{iA || 'a'}, {iB || 'b'}] aralığında
              </p>
            </div>
          )}
          {iResult && !iResult.ok && (
            <p className="error-note" role="alert">
              {iResult.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
