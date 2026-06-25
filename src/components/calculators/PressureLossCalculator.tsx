import { useState } from 'react';
import {
  solvePressureLoss,
  PIPE_ROUGHNESS,
  type PressureLossResult,
} from '../../calculators/thermal/basinc-kaybi';
import { FLUIDS, OZEL_ID } from '../../calculators/thermal/reynolds';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const FLUID_OPTIONS = FLUIDS.map((f) => ({ value: f.id, label: f.label }));
const PIPE_OPTIONS = PIPE_ROUGHNESS.map((p) => ({ value: p.id, label: p.label }));

/**
 * Pipe pressure-loss island (Darcy-Weisbach). Fluid + diameter + velocity +
 * length + pipe material feed the pure `solvePressureLoss` (which reuses the
 * Reynolds engine for Re and a Swamee-Jain friction factor). Selecting "Özel"
 * reveals custom ρ/μ inputs. Live compute; "Temizle" resets.
 */
export default function PressureLossCalculator() {
  const [fluidId, setFluidId] = useState('su');
  const [customRho, setCustomRho] = useState('1000');
  const [customMu, setCustomMu] = useState('0.001');
  const [diameter, setDiameter] = useState('50');
  const [velocity, setVelocity] = useState('2');
  const [length, setLength] = useState('10');
  const [pipeId, setPipeId] = useState('celik');

  const isOzel = fluidId === OZEL_ID;
  const isBlank =
    diameter.trim() === '' ||
    velocity.trim() === '' ||
    length.trim() === '' ||
    (isOzel && (customRho.trim() === '' || customMu.trim() === ''));

  let result: PressureLossResult | null = null;
  if (!isBlank) {
    result = solvePressureLoss({
      fluidId,
      ...(isOzel
        ? { customRho: parseField(customRho) ?? NaN, customMu: parseField(customMu) ?? NaN }
        : {}),
      diameterMm: parseField(diameter) ?? NaN,
      velocityMs: parseField(velocity) ?? NaN,
      lengthM: parseField(length) ?? NaN,
      pipeId,
    });
  }

  function handleClear(): void {
    setFluidId('su');
    setCustomRho('1000');
    setCustomMu('0.001');
    setDiameter('50');
    setVelocity('');
    setLength('10');
    setPipeId('celik');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Basınç Kaybı', value: formatNumber(result.pressureDropKPa), unit: 'kPa' },
          { label: 'Yük Kaybı', value: formatNumber(result.headLossM), unit: 'mSS' },
        ]
      : [];

  const flowRows =
    result && result.ok
      ? [
          { label: 'Reynolds Sayısı', value: formatNumber(result.reynolds) },
          { label: 'Akış Rejimi', value: result.regime },
          { label: 'Sürtünme Faktörü (f)', value: formatNumber(result.frictionFactor) },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            ΔP = f·(L/D)·(ρ·v²/2). Türbülanslı akışta f, Swamee-Jain yaklaşımıyla hesaplanır.
            Sabit değerler ~20 °C içindir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect label="Akışkan" value={fluidId} options={FLUID_OPTIONS} onChange={setFluidId} />
            <UnitSelect label="Boru Malzemesi" value={pipeId} options={PIPE_OPTIONS} onChange={setPipeId} />
            <NumberInput label="Boru Çapı" unit="mm" value={diameter} onChange={setDiameter} />
            <NumberInput label="Akış Hızı" unit="m/s" value={velocity} onChange={setVelocity} />
            <NumberInput label="Boru Uzunluğu" unit="m" value={length} onChange={setLength} />
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
          <ResultCard values={heroValues} caption="Borudaki sürtünme kaynaklı toplam basınç ve yük kaybı." />
          {result.note && (
            <div className="rounded-[11px] border border-border-strong bg-surface-sunken px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
              {result.note}
            </div>
          )}
          <div>
            <SectionLabel>Akış Bilgileri</SectionLabel>
            <div className="ui-card mt-3 overflow-hidden">
              {flowRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex items-baseline justify-between gap-3 px-4 py-2.5${
                    index > 0 ? ' border-t border-hairline' : ''
                  }`}
                >
                  <span className="text-[12.5px] text-text-muted">{row.label}</span>
                  <span className="font-mono text-[13px] text-text">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Basınç / Yük Kaybı</SectionLabel>
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
