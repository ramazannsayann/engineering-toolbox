import { useState } from 'react';
import {
  solveReynolds,
  FLUIDS,
  OZEL_ID,
  type ReynoldsResult,
} from '../../calculators/thermal/reynolds';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const FLUID_OPTIONS = FLUIDS.map((f) => ({ value: f.id, label: f.label }));

/**
 * Reynolds number island. Velocity + diameter + fluid feed the pure
 * `solveReynolds`; selecting "Özel" reveals custom ρ and μ inputs. The flow
 * regime is shown prominently below the Re hero. Live compute; "Temizle" resets.
 */
export default function ReynoldsCalculator() {
  const [velocity, setVelocity] = useState('2');
  const [diameter, setDiameter] = useState('50');
  const [fluidId, setFluidId] = useState('su');
  const [customRho, setCustomRho] = useState('1000');
  const [customMu, setCustomMu] = useState('0.001');

  const isOzel = fluidId === OZEL_ID;
  const isBlank =
    velocity.trim() === '' ||
    diameter.trim() === '' ||
    (isOzel && (customRho.trim() === '' || customMu.trim() === ''));

  let result: ReynoldsResult | null = null;
  if (!isBlank) {
    result = solveReynolds({
      velocityMs: parseField(velocity) ?? NaN,
      diameterMm: parseField(diameter) ?? NaN,
      fluidId,
      ...(isOzel
        ? { customRho: parseField(customRho) ?? NaN, customMu: parseField(customMu) ?? NaN }
        : {}),
    });
  }

  function handleClear(): void {
    setVelocity('');
    setDiameter('50');
    setFluidId('su');
    setCustomRho('1000');
    setCustomMu('0.001');
  }

  const heroValues: ResultValue[] =
    result && result.ok ? [{ label: 'Reynolds Sayısı', value: formatNumber(result.reynolds), unit: '' }] : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Re = ρ·v·D / μ. Akışkanı seçin; yoğunluk ve viskozite otomatik kullanılır.
            Sabit değerler ~20 °C içindir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Akış Hızı" unit="m/s" value={velocity} onChange={setVelocity} />
            <NumberInput label="Boru Çapı" unit="mm" value={diameter} onChange={setDiameter} />
            <UnitSelect label="Akışkan" value={fluidId} options={FLUID_OPTIONS} onChange={setFluidId} />
            {isOzel && (
              <>
                <NumberInput label="Yoğunluk (ρ)" unit="kg/m³" value={customRho} onChange={setCustomRho} />
                <NumberInput label="Dinamik Viskozite (μ)" unit="Pa·s" value={customMu} onChange={setCustomMu} />
              </>
            )}
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
            caption={`ρ = ${formatNumber(result.rhoUsed)} kg/m³, μ = ${formatNumber(result.muUsed)} Pa·s kullanıldı.`}
          />
          <div className="flex items-center justify-between gap-3 rounded-[11px] border border-border-strong bg-surface-sunken px-4 py-3.5">
            <span className="mono-label">Akış Rejimi</span>
            <span className="font-mono text-[16px] font-medium text-accent">{result.regime}</span>
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
