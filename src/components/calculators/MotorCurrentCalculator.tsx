import { useState } from 'react';
import {
  solveMotorCurrent,
  type MotorCurrentResult,
} from '../../calculators/electrical/motor-akimi';
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
 * Motor full-load current island. Delegates ALL math to the pure
 * `solveMotorCurrent` engine — no formulas reimplemented here.
 */
export default function MotorCurrentCalculator() {
  const [phase, setPhase] = useState('3');
  const [outputPower, setOutputPower] = useState('');
  const [voltage, setVoltage] = useState('');
  const [efficiency, setEfficiency] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [result, setResult] = useState<MotorCurrentResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveMotorCurrent({
        phase: phase === '1' ? 1 : 3,
        outputPowerKw: parseField(outputPower),
        voltageV: parseField(voltage),
        efficiencyPercent: parseField(efficiency),
        powerFactor: parseField(powerFactor),
      }),
    );
  }

  function handleClear(): void {
    setOutputPower('');
    setVoltage('');
    setEfficiency('');
    setPowerFactor('');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Tam Yük Akımı (I)', value: formatNumber(result.values.current), unit: 'A' },
          { label: 'Giriş Gücü (P_giriş)', value: formatNumber(result.values.inputPowerKw), unit: 'kW' },
          { label: 'Kayıplar', value: formatNumber(result.values.lossesKw), unit: 'kW' },
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
            P, motorun mil/çıkış (mekanik) gücüdür. Üç fazda gerilim hat-hat
            (line-to-line) değeridir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect label="Faz" value={phase} options={PHASE_OPTIONS} onChange={setPhase} />
            <NumberInput
              label="Çıkış Gücü (P)"
              unit="kW"
              value={outputPower}
              onChange={setOutputPower}
            />
            <NumberInput label="Gerilim (V)" unit="V" value={voltage} onChange={setVoltage} />
            <NumberInput label="Verim (η)" unit="%" value={efficiency} onChange={setEfficiency} />
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
          <ResultCard values={heroValues} caption="Motor çıkış gücü, verim ve cosφ’den hesaplandı." />
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
