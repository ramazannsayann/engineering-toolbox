import { useState } from 'react';
import { solvePumpPower } from '../../calculators/hvac/pompa-gucu';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * Pump power island. Live compute; "Temizle" resets. Delegates to the pure
 * `solvePumpPower` engine (P = ρ·g·Q·H / η). Power is MECHANICAL → reported in
 * kW and HP only (no thermal BTU/kcal).
 */
export default function PumpPowerCalculator() {
  const [flow, setFlow] = useState('10');
  const [head, setHead] = useState('20');
  const [efficiency, setEfficiency] = useState('70');

  const isBlank = flow.trim() === '' || head.trim() === '' || efficiency.trim() === '';
  const result = isBlank
    ? null
    : solvePumpPower({
        flowM3h: parseField(flow) ?? NaN,
        headM: parseField(head) ?? NaN,
        efficiencyPct: parseField(efficiency) ?? NaN,
      });

  function handleClear(): void {
    setFlow('');
    setHead('');
    setEfficiency('');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Gereken Mil Gücü', value: formatNumber(result.shaftKW), unit: 'kW' },
          { label: 'Mil Gücü', value: formatNumber(result.shaftHP), unit: 'HP' },
          { label: 'Hidrolik (Faydalı) Güç', value: formatNumber(result.hydraulicKW), unit: 'kW' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Debi, basma yüksekliği ve pompa verimini girin; gereken mil gücü
            (mekanik) kW ve HP olarak hesaplanır. Su için ρ = 1000 kg/m³,
            g = 9,81 m/s² alınmıştır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Debi (Q)" unit="m³/saat" value={flow} onChange={setFlow} />
            <NumberInput label="Basma Yüksekliği (H)" unit="m" value={head} onChange={setHead} />
            <NumberInput label="Pompa Verimi (η)" unit="%" value={efficiency} onChange={setEfficiency} />
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
          Tüm değerleri girin.
        </p>
      )}
      {!isBlank && result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}
      {!isBlank && result && result.ok && (
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <ResultCard
            values={heroValues}
            caption="Hidrolik güç pompanın suya verdiği faydalı güçtür; mil gücü ise verim kaybı nedeniyle daha yüksektir (motor bunu sağlamalıdır)."
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
