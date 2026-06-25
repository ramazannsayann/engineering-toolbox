import { useState } from 'react';
import { solvePipeDiameter } from '../../calculators/hvac/boru-capi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * Pipe diameter island. Live compute; "Temizle" resets. Delegates to the pure
 * `solvePipeDiameter` engine (d = √(4A/π); A = Q/v) and recommends a nominal DN.
 */
export default function PipeDiameterCalculator() {
  const [flow, setFlow] = useState('10');
  const [velocity, setVelocity] = useState('1.5');

  const isBlank = flow.trim() === '' || velocity.trim() === '';
  const result = isBlank
    ? null
    : solvePipeDiameter({
        flowM3h: parseField(flow) ?? NaN,
        velocityMs: parseField(velocity) ?? NaN,
      });

  function handleClear(): void {
    setFlow('');
    setVelocity('');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Gereken İç Çap', value: formatNumber(result.requiredDiameterMm), unit: 'mm' },
          {
            label: 'Önerilen Nominal Çap',
            value: result.recommendedDN !== null ? `DN${result.recommendedDN}` : '—',
            unit: '',
          },
        ]
      : [];

  const caption =
    result && result.ok
      ? `DN nominal bir gösterimdir; gerçek iç çap boru malzemesine/sınıfına göre değişir.${
          result.note ? ` ${result.note}` : ''
        }`
      : '';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Taşınacak debiyi ve hedef akış hızını girin; gereken boru iç çapı ve
            önerilen nominal çap (DN) hesaplanır. Tesisatta hız genellikle
            1–2 m/s arasında tutulur.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Debi (Q)" unit="m³/saat" value={flow} onChange={setFlow} />
            <NumberInput label="Hedef Akış Hızı" unit="m/s" value={velocity} onChange={setVelocity} />
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
          <ResultCard values={heroValues} caption={caption} />
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
