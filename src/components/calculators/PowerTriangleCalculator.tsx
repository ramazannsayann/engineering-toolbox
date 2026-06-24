import { useState } from 'react';
import {
  solvePowerTriangle,
  type PowerTriangleInput,
  type PowerTriangleResult,
} from '../../calculators/electrical/guc-ucgeni';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

type FieldKey = 'activePower' | 'reactivePower' | 'apparentPower' | 'powerFactor';

interface FieldDef {
  key: FieldKey;
  label: string;
  unit: string;
}

const FIELDS: readonly FieldDef[] = [
  { key: 'activePower', label: 'Aktif Güç (P)', unit: 'kW' },
  { key: 'reactivePower', label: 'Reaktif Güç (Q)', unit: 'kvar' },
  { key: 'apparentPower', label: 'Görünür Güç (S)', unit: 'kVA' },
  { key: 'powerFactor', label: 'Güç Faktörü (cosφ)', unit: '–' },
];

const EMPTY: Record<FieldKey, string> = {
  activePower: '',
  reactivePower: '',
  apparentPower: '',
  powerFactor: '',
};

/**
 * Power-triangle island. Delegates ALL math to the pure `solvePowerTriangle`
 * engine — no formulas are reimplemented here.
 */
export default function PowerTriangleCalculator() {
  const [fields, setFields] = useState<Record<FieldKey, string>>(EMPTY);
  const [result, setResult] = useState<PowerTriangleResult | null>(null);
  const [computed, setComputed] = useState<readonly FieldKey[]>([]);

  function update(key: FieldKey, value: string): void {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleCalculate(): void {
    const input: PowerTriangleInput = {};
    for (const field of FIELDS) {
      const parsed = parseField(fields[field.key]);
      if (parsed !== undefined) input[field.key] = parsed;
    }
    const next = solvePowerTriangle(input);
    setResult(next);
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
            Dört değerden herhangi ikisini girin; kalan ikisi hesaplanır. Endüktif
            (gecikmeli) yük varsayılır (Q ≥ 0).
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
