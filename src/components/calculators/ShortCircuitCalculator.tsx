import { useState } from 'react';
import {
  solveShortCircuit,
  type ShortCircuitResult,
} from '../../calculators/electrical/kisa-devre-akimi';
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
 * Short-circuit current island (infinite-bus). Delegates ALL math to the pure
 * `solveShortCircuit` engine — no formulas reimplemented here.
 */
export default function ShortCircuitCalculator() {
  const [phase, setPhase] = useState('3');
  const [transformerKva, setTransformerKva] = useState('');
  const [voltage, setVoltage] = useState('');
  const [impedance, setImpedance] = useState('');
  const [result, setResult] = useState<ShortCircuitResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveShortCircuit({
        phase: phase === '1' ? 1 : 3,
        transformerKva: parseField(transformerKva),
        voltageV: parseField(voltage),
        impedancePercent: parseField(impedance),
      }),
    );
  }

  function handleClear(): void {
    setTransformerKva('');
    setVoltage('');
    setImpedance('');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Kısa Devre Akımı (I_k)', value: formatNumber(result.values.shortCircuitKa), unit: 'kA' },
          { label: 'Anma Akımı (I_n)', value: formatNumber(result.values.nominalCurrentA), unit: 'A' },
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
            Sonsuz bara varsayımı: üst şebeke ve kablo empedansı ihmal edilir
            (sonuç bir üst sınırdır). Üç fazda gerilim hat-hat değeridir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect label="Faz" value={phase} options={PHASE_OPTIONS} onChange={setPhase} />
            <NumberInput
              label="Trafo Gücü (S)"
              unit="kVA"
              value={transformerKva}
              onChange={setTransformerKva}
            />
            <NumberInput label="Sekonder Gerilim (V)" unit="V" value={voltage} onChange={setVoltage} />
            <NumberInput
              label="Empedans Gerilimi (uk)"
              unit="%"
              value={impedance}
              onChange={setImpedance}
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
          <ResultCard
            values={heroValues}
            caption="Sonsuz bara varsayımıyla; gerçek arıza akımı üst şebeke ve kablo empedansıyla daha düşüktür. Koruma cihazı seçimi için IEC 60909 etüdü gerekir."
          />
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
