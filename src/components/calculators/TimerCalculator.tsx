import { useState } from 'react';
import {
  solveTimer,
  formatFrequencyParts,
  type TimerResult,
  type CapacitanceUnit,
} from '../../calculators/electrical/555-timer';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const CAP_UNIT_OPTIONS = [
  { value: 'nF', label: 'nF' },
  { value: 'µF', label: 'µF' },
];

/**
 * 555 astable timer island. Delegates ALL math to the pure `solveTimer`
 * engine — no formulas reimplemented here.
 */
export default function TimerCalculator() {
  const [r1, setR1] = useState('');
  const [r2, setR2] = useState('');
  const [cap, setCap] = useState('');
  const [capUnit, setCapUnit] = useState('nF');
  const [result, setResult] = useState<TimerResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveTimer({
        r1KOhm: parseField(r1),
        r2KOhm: parseField(r2),
        capacitance: parseField(cap),
        capacitanceUnit: capUnit as CapacitanceUnit,
      }),
    );
  }

  function handleClear(): void {
    setR1('');
    setR2('');
    setCap('');
    setResult(null);
  }

  const freqParts = result && result.ok ? formatFrequencyParts(result.values.frequencyHz) : null;

  const heroValues: ResultValue[] =
    result && result.ok && freqParts
      ? [
          { label: 'Frekans (f)', value: freqParts.value, unit: freqParts.unit },
          { label: 'Periyot (T)', value: formatNumber(result.values.periodS * 1000), unit: 'ms' },
          { label: 'Yüksek Süre (t_y)', value: formatNumber(result.values.highTimeS * 1000), unit: 'ms' },
          { label: 'Düşük Süre (t_d)', value: formatNumber(result.values.lowTimeS * 1000), unit: 'ms' },
          { label: 'Görev Oranı', value: formatNumber(result.values.dutyPercent), unit: '%' },
        ]
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
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Astable (kararsız) mod. Kondansatör C, R1 üzerinden şarj, R2 üzerinden
            deşarj olur; bu nedenle görev oranı her zaman %50’nin üzerindedir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="R1" unit="kΩ" value={r1} onChange={setR1} />
            <NumberInput label="R2" unit="kΩ" value={r2} onChange={setR2} />
            <NumberInput label="Kondansatör (C)" unit={capUnit} value={cap} onChange={setCap} />
            <UnitSelect
              label="C Birimi"
              value={capUnit}
              options={CAP_UNIT_OPTIONS}
              onChange={setCapUnit}
            />
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
          <ResultCard values={heroValues} caption="Astable 555 için R1, R2 ve C değerlerinden hesaplandı." />
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
