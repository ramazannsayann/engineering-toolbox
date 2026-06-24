import { useState } from 'react';
import {
  solveCurrent,
  type CurrentResult,
} from '../../calculators/electrical/amper-hesabi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const POWER_TYPE_OPTIONS = [
  { value: 'kVA', label: 'kVA' },
  { value: 'kW', label: 'kW' },
];

const PHASE_OPTIONS = [
  { value: '3', label: '3 faz' },
  { value: '1', label: '1 faz' },
];

/**
 * Line-current island (power → I). Delegates ALL math to the pure `solveCurrent`
 * engine. cosφ is only shown/used on the kW path.
 */
export default function CurrentCalculator() {
  const [powerType, setPowerType] = useState('kVA');
  const [phase, setPhase] = useState('3');
  const [power, setPower] = useState('');
  const [voltage, setVoltage] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [result, setResult] = useState<CurrentResult | null>(null);

  const isKw = powerType === 'kW';

  function handleCalculate(): void {
    setResult(
      solveCurrent({
        powerType: isKw ? 'kW' : 'kVA',
        power: parseField(power),
        voltage: parseField(voltage),
        powerFactor: isKw ? parseField(powerFactor) : undefined,
        phase: phase === '1' ? 1 : 3,
      }),
    );
  }

  function handleClear(): void {
    setPower('');
    setVoltage('');
    setPowerFactor('');
    setResult(null);
  }

  const heroValues: ResultValue[] = [];
  if (result && result.ok) {
    heroValues.push({ label: 'Hat Akımı (I)', value: formatNumber(result.values.current), unit: 'A' });
    heroValues.push({
      label: 'Görünür Güç (S)',
      value: formatNumber(result.values.apparentPower),
      unit: 'kVA',
    });
    if (result.values.activePower !== undefined) {
      heroValues.push({
        label: 'Aktif Güç (P)',
        value: formatNumber(result.values.activePower),
        unit: 'kW',
      });
    }
  }

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
            Üç fazda gerilim hat-hat (line-to-line) değeridir. cosφ yalnızca kW
            girişinde gereklidir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect
              label="Güç Türü"
              value={powerType}
              options={POWER_TYPE_OPTIONS}
              onChange={setPowerType}
            />
            <UnitSelect label="Faz" value={phase} options={PHASE_OPTIONS} onChange={setPhase} />
            <NumberInput
              label="Güç"
              unit={isKw ? 'kW' : 'kVA'}
              value={power}
              onChange={setPower}
            />
            <NumberInput label="Gerilim (V)" unit="V" value={voltage} onChange={setVoltage} />
            {isKw && (
              <NumberInput
                label="Güç Faktörü (cosφ)"
                unit="–"
                value={powerFactor}
                onChange={setPowerFactor}
              />
            )}
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
          <ResultCard values={heroValues} caption="Güç ve gerilimden hesaplandı." />
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
