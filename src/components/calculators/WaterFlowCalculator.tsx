import { useState } from 'react';
import { solveWaterFlow } from '../../calculators/hvac/su-debisi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { parseField } from './parse';

/**
 * Water flow island. Live compute; "Temizle" resets. Delegates to the pure
 * `solveWaterFlow` engine (Q = A·v).
 */
export default function WaterFlowCalculator() {
  const [diameter, setDiameter] = useState('50');
  const [velocity, setVelocity] = useState('2');

  const isBlank = diameter.trim() === '' || velocity.trim() === '';
  const result = isBlank
    ? null
    : solveWaterFlow({
        diameterMm: parseField(diameter) ?? NaN,
        velocityMs: parseField(velocity) ?? NaN,
      });

  function handleClear(): void {
    setDiameter('');
    setVelocity('');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [{ label: 'Su Debisi', value: result.rows[0].value, unit: 'm³/saat' }]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Borunun iç çapını ve akış hızını girin; debi üç farklı birimde anında
            hesaplanır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Boru İç Çapı" unit="mm" value={diameter} onChange={setDiameter} />
            <NumberInput label="Akış Hızı" unit="m/s" value={velocity} onChange={setVelocity} />
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
          <ResultCard values={heroValues} caption="Q = A × v ile hesaplandı." />
          <div>
            <SectionLabel>Debi Birimleri</SectionLabel>
            <div className="mt-3">
              <ConversionResult
                rows={result.rows.map((row) => ({ label: row.label, value: row.value }))}
              />
            </div>
          </div>
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
