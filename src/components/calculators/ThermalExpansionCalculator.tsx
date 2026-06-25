import { useState } from 'react';
import {
  solveThermalExpansion,
  EXPANSION_MATERIALS,
  OZEL_ID,
  type ThermalExpansionResult,
} from '../../calculators/thermal/isil-genlesme';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const MATERIAL_OPTIONS = EXPANSION_MATERIALS.map((m) => ({
  value: m.id,
  // Show α in the conventional ×10⁻⁶ form for the named materials.
  label: m.alpha === null ? m.label : `${m.label} (α = ${m.alpha * 1e6} ×10⁻⁶/°C)`,
}));

/**
 * Thermal (linear) expansion island (ΔL = α·L·ΔT). Length + ΔT + material feed
 * the pure `solveThermalExpansion`; selecting "Özel" reveals a custom α input.
 * Negative ΔT (cooling) is allowed and reported as kısalma. Live; "Temizle".
 */
export default function ThermalExpansionCalculator() {
  const [length, setLength] = useState('10');
  const [deltaT, setDeltaT] = useState('50');
  const [materialId, setMaterialId] = useState('celik');
  const [customAlpha, setCustomAlpha] = useState('0.00005');

  const isOzel = materialId === OZEL_ID;
  const isBlank =
    length.trim() === '' || deltaT.trim() === '' || (isOzel && customAlpha.trim() === '');

  let result: ThermalExpansionResult | null = null;
  if (!isBlank) {
    result = solveThermalExpansion({
      lengthM: parseField(length) ?? NaN,
      deltaT: parseField(deltaT) ?? NaN,
      materialId,
      ...(isOzel ? { customAlpha: parseField(customAlpha) ?? NaN } : {}),
    });
  }

  function handleClear(): void {
    setLength('');
    setDeltaT('50');
    setMaterialId('celik');
    setCustomAlpha('0.00005');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Uzama (ΔL)', value: formatNumber(result.deltaLmm), unit: 'mm' },
          { label: 'Yeni Boy', value: formatNumber(result.newLengthM), unit: 'm' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            ΔL = α·L·ΔT. Malzemeyi seçin; genleşme katsayısı otomatik kullanılır.
            Sabit değerler ~20 °C içindir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="İlk Boy" unit="m" value={length} onChange={setLength} />
            <NumberInput label="Sıcaklık Farkı (ΔT)" unit="°C" value={deltaT} onChange={setDeltaT} />
            <UnitSelect label="Malzeme" value={materialId} options={MATERIAL_OPTIONS} onChange={setMaterialId} />
            {isOzel && (
              <NumberInput label="Genleşme Katsayısı (α)" unit="1/°C" value={customAlpha} onChange={setCustomAlpha} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </div>

      <div className="rounded-[11px] border border-border-strong bg-surface-sunken px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
        Sıcaklık farkı negatif girilirse (soğuma) sonuç <span className="text-text">kısalmadır</span> (ΔL &lt; 0).
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
            caption={`${result.materialLabel}, α = ${formatNumber(result.alphaUsed)} 1/°C — ${result.direction}.`}
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
