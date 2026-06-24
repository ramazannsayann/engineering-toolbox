import { useState } from 'react';
import {
  solveOhmsLaw,
  type OhmsLawInput,
  type OhmsLawResult,
} from '../../calculators/electrical/ohms-law';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';

type FieldKey = 'voltage' | 'current' | 'resistance' | 'power';

interface FieldDef {
  key: FieldKey;
  label: string;
  unit: string;
}

const FIELDS: readonly FieldDef[] = [
  { key: 'voltage', label: 'Gerilim', unit: 'V' },
  { key: 'current', label: 'Akım', unit: 'A' },
  { key: 'resistance', label: 'Direnç', unit: 'Ω' },
  { key: 'power', label: 'Güç', unit: 'W' },
];

const EMPTY: Record<FieldKey, string> = {
  voltage: '',
  current: '',
  resistance: '',
  power: '',
};

/** Display formatting only (NOT calculation): 6 sig figs, trailing zeros dropped. */
function formatNumber(value: number): string {
  return String(parseFloat(value.toPrecision(6)));
}

/** Blank field -> undefined; otherwise a number (NaN for unparseable text, which
 *  the pure solver then reports as INVALID_NUMBER). Accepts a comma decimal. */
function parseField(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  return Number(trimmed.replace(',', '.'));
}

/**
 * Ohm's Law calculator island. Owns the form state and delegates ALL math to the
 * pure `solveOhmsLaw` from the Chunk 2 engine — no formulas are reimplemented here.
 */
export default function OhmsLawCalculator() {
  const [fields, setFields] = useState<Record<FieldKey, string>>(EMPTY);
  const [result, setResult] = useState<OhmsLawResult | null>(null);
  const [computed, setComputed] = useState<readonly FieldKey[]>([]);

  function update(key: FieldKey, value: string): void {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleCalculate(): void {
    const input: OhmsLawInput = {};
    for (const field of FIELDS) {
      const parsed = parseField(fields[field.key]);
      if (parsed !== undefined) input[field.key] = parsed;
    }
    const next = solveOhmsLaw(input);
    setResult(next);
    // The "hero" outputs are the two quantities the user did NOT enter.
    setComputed(
      next.ok
        ? FIELDS.filter((field) => input[field.key] === undefined).map((field) => field.key)
        : [],
    );
  }

  function handleClear(): void {
    setFields(EMPTY);
    setResult(null);
    setComputed([]);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? computed.map((key) => {
          const field = FIELDS.find((candidate) => candidate.key === key)!;
          return {
            label: field.label,
            value: formatNumber(result.values[key]),
            unit: field.unit,
          };
        })
      : [];

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleCalculate();
        }}
      >
        <div>
          <SectionLabel>Bilinen Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Dört değerden herhangi ikisini girin; kalan ikisi otomatik hesaplanır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <NumberInput
                key={field.key}
                label={field.label}
                unit={field.unit}
                value={fields[field.key]}
                onChange={(value) => update(field.key, value)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* type="submit" so Enter in any field triggers the calculation. */}
          <Button variant="primary" type="submit">
            Hesapla
          </Button>
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </form>

      {result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <ResultCard values={heroValues} caption="Girilen iki değerden hesaplandı." />
          <div>
            <SectionLabel>Adım Adım Çözüm</SectionLabel>
            <div className="mt-3">
              <StepList steps={result.steps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
