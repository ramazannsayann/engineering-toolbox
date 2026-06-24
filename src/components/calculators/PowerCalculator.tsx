import { useState } from 'react';
import { solvePower, type PowerResult } from '../../calculators/electrical/guc-hesabi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const PHASE_OPTIONS = [
  { value: '3', label: '3 faz' },
  { value: '1', label: '1 faz' },
];

/**
 * Power island (V·I·cosφ → P, Q, S). Delegates ALL math to the pure `solvePower`
 * engine — no formulas are reimplemented here.
 */
export default function PowerCalculator() {
  const [phase, setPhase] = useState('3');
  const [voltage, setVoltage] = useState('');
  const [current, setCurrent] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [result, setResult] = useState<PowerResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solvePower({
        phase: phase === '1' ? 1 : 3,
        voltage: parseField(voltage),
        current: parseField(current),
        powerFactor: parseField(powerFactor),
      }),
    );
  }

  function handleClear(): void {
    setVoltage('');
    setCurrent('');
    setPowerFactor('');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Aktif Güç (P)', value: formatNumber(result.values.activePower), unit: 'kW' },
          { label: 'Görünür Güç (S)', value: formatNumber(result.values.apparentPower), unit: 'kVA' },
          { label: 'Reaktif Güç (Q)', value: formatNumber(result.values.reactivePower), unit: 'kvar' },
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
            Üç fazda gerilim hat-hat (line-to-line) değeridir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect
              label="Faz"
              value={phase}
              options={PHASE_OPTIONS}
              onChange={setPhase}
            />
            <NumberInput label="Gerilim (V)" unit="V" value={voltage} onChange={setVoltage} />
            <NumberInput label="Akım (I)" unit="A" value={current} onChange={setCurrent} />
            <NumberInput
              label="Güç Faktörü (cosφ)"
              unit="–"
              value={powerFactor}
              onChange={setPowerFactor}
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
          <ResultCard values={heroValues} caption="Gerilim, akım ve güç faktöründen hesaplandı." />
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
