import { useState } from 'react';
import { solveFlowRate, type FlowRateResult } from '../../calculators/thermal/debi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * General volumetric flow-rate island (Q = A·v). Diameter + velocity feed the
 * pure `solveFlowRate`; the result is shown as m³/h (hero) plus copyable rows
 * for m³/h, L/min and L/s. Live compute; "Temizle" resets.
 */
export default function FlowRateCalculator() {
  const [diameter, setDiameter] = useState('50');
  const [velocity, setVelocity] = useState('2');

  const isBlank = diameter.trim() === '' || velocity.trim() === '';

  let result: FlowRateResult | null = null;
  if (!isBlank) {
    result = solveFlowRate({
      diameterMm: parseField(diameter) ?? NaN,
      velocityMs: parseField(velocity) ?? NaN,
    });
  }

  function handleClear(): void {
    setDiameter('');
    setVelocity('2');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Debi', value: formatNumber(result.m3PerHour), unit: 'm³/saat' },
          { label: 'Debi (L/saniye)', value: formatNumber(result.lPerSec), unit: 'L/s' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Q = A·v. Dairesel kesit için A = π·(d/2)². Çap ve akış hızını girin.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Kesit Çapı" unit="mm" value={diameter} onChange={setDiameter} />
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
          Gerekli değerleri girin.
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
            caption={`Kesit alanı A = ${formatNumber(result.areaM2)} m².`}
          />
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
