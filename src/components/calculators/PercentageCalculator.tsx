import { useState } from 'react';
import {
  convertPercentage,
  YUZDE_MODES,
  type YuzdeMode,
} from '../../calculators/general/yuzde';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const MODE_OPTIONS = YUZDE_MODES.map((m) => ({ value: m.id, label: m.label }));

/** Per-mode labels + unit badges for the two inputs. */
const FIELD_LABELS: Record<YuzdeMode, { a: string; aUnit: string; b: string; bUnit: string }> = {
  of: { a: 'Sayı', aUnit: '—', b: 'Yüzde', bUnit: '%' },
  isWhatPercent: { a: 'X sayısı', aUnit: '—', b: 'Y sayısı', bUnit: '—' },
  change: { a: 'İlk değer', aUnit: '—', b: 'Son değer', bUnit: '—' },
};

/** Sensible default inputs per mode (so switching mode shows a live result). */
const DEFAULTS: Record<YuzdeMode, { a: string; b: string }> = {
  of: { a: '200', b: '15' },
  isWhatPercent: { a: '50', b: '200' },
  change: { a: '100', b: '150' },
};

/**
 * Percentage calculator island. Live compute; "Temizle" resets. The mode
 * selector relabels the two inputs and resets them to sensible defaults; the
 * pure `convertPercentage` engine handles all math + zero-division guards.
 */
export default function PercentageCalculator() {
  const [mode, setMode] = useState<YuzdeMode>('of');
  const [a, setA] = useState(DEFAULTS.of.a);
  const [b, setB] = useState(DEFAULTS.of.b);

  function handleModeChange(value: string): void {
    const next = value as YuzdeMode;
    setMode(next);
    setA(DEFAULTS[next].a);
    setB(DEFAULTS[next].b);
  }

  function handleClear(): void {
    setMode('of');
    setA('');
    setB('');
  }

  const fields = FIELD_LABELS[mode];
  const aNum = parseField(a);
  const bNum = parseField(b);
  const isBlank = a.trim() === '' || b.trim() === '';
  const result = isBlank ? null : convertPercentage({ mode, a: aNum ?? NaN, b: bNum ?? NaN });

  const heroValues: ResultValue[] =
    result && result.ok
      ? [{ label: 'Sonuç', value: formatNumber(result.result), unit: result.unit }]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Hesaplama Türü</SectionLabel>
          <div className="mt-3 max-w-[280px]">
            <UnitSelect label="Mod" value={mode} options={MODE_OPTIONS} onChange={handleModeChange} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label={fields.a} unit={fields.aUnit} value={a} onChange={setA} />
            <NumberInput label={fields.b} unit={fields.bUnit} value={b} onChange={setB} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </div>

      {isBlank && (
        <p className="error-note" role="alert">
          İki değeri de girin.
        </p>
      )}
      {!isBlank && result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}
      {!isBlank && result && result.ok && (
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <ResultCard values={heroValues} caption={result.resultLabel} />
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
