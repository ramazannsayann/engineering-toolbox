import { useState } from 'react';
import {
  solveCompensation,
  type CompensationResult,
} from '../../calculators/electrical/kompanzasyon';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * Compensation island (required kvar to raise cosφ₁ → cosφ₂). Delegates ALL math
 * to the pure `solveCompensation` engine.
 */
export default function CompensationCalculator() {
  const [activePower, setActivePower] = useState('');
  const [currentPowerFactor, setCurrentPowerFactor] = useState('');
  const [targetPowerFactor, setTargetPowerFactor] = useState('');
  const [result, setResult] = useState<CompensationResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveCompensation({
        activePower: parseField(activePower),
        currentPowerFactor: parseField(currentPowerFactor),
        targetPowerFactor: parseField(targetPowerFactor),
      }),
    );
  }

  function handleClear(): void {
    setActivePower('');
    setCurrentPowerFactor('');
    setTargetPowerFactor('');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Gerekli Kompanzasyon (Qc)', value: formatNumber(result.values.requiredKvar), unit: 'kvar' },
          { label: 'Önce Görünür Güç (S₁)', value: formatNumber(result.values.apparentBefore), unit: 'kVA' },
          { label: 'Sonra Görünür Güç (S₂)', value: formatNumber(result.values.apparentAfter), unit: 'kVA' },
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
            Hedef güç faktörü, mevcut güç faktöründen büyük olmalıdır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput
              label="Aktif Güç (P)"
              unit="kW"
              value={activePower}
              onChange={setActivePower}
            />
            <NumberInput
              label="Mevcut Güç Faktörü (cosφ₁)"
              unit="–"
              value={currentPowerFactor}
              onChange={setCurrentPowerFactor}
            />
            <NumberInput
              label="Hedef Güç Faktörü (cosφ₂)"
              unit="–"
              value={targetPowerFactor}
              onChange={setTargetPowerFactor}
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
          <ResultCard values={heroValues} caption="Mevcut ve hedef güç faktöründen hesaplandı." />
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
