import { useState } from 'react';
import {
  solveHeatConduction,
  CONDUCTIVITY_MATERIALS,
  OZEL_ID,
  type HeatConductionResult,
} from '../../calculators/thermal/isi-iletimi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const MATERIAL_OPTIONS = CONDUCTIVITY_MATERIALS.map((m) => ({
  value: m.id,
  label: m.k === null ? m.label : `${m.label} (k = ${m.k})`,
}));

/**
 * Heat-conduction island (Fourier: Q = k·A·ΔT/d). Area + ΔT + thickness +
 * material feed the pure `solveHeatConduction`; selecting "Özel" reveals a
 * custom k input. The result is a heat RATE (power, W). Live; "Temizle".
 */
export default function HeatConductionCalculator() {
  const [area, setArea] = useState('10');
  const [deltaT, setDeltaT] = useState('20');
  const [thickness, setThickness] = useState('100');
  const [materialId, setMaterialId] = useState('yalitim');
  const [customK, setCustomK] = useState('1.5');

  const isOzel = materialId === OZEL_ID;
  const isBlank =
    area.trim() === '' || deltaT.trim() === '' || thickness.trim() === '' || (isOzel && customK.trim() === '');

  let result: HeatConductionResult | null = null;
  if (!isBlank) {
    result = solveHeatConduction({
      areaM2: parseField(area) ?? NaN,
      deltaT: parseField(deltaT) ?? NaN,
      thicknessMm: parseField(thickness) ?? NaN,
      materialId,
      ...(isOzel ? { customK: parseField(customK) ?? NaN } : {}),
    });
  }

  function handleClear(): void {
    setArea('');
    setDeltaT('20');
    setThickness('100');
    setMaterialId('yalitim');
    setCustomK('1.5');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Isı Akısı', value: formatNumber(result.heatRateW), unit: 'W' },
          { label: 'Isı Akısı (kW)', value: formatNumber(result.heatRateKW), unit: 'kW' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Q = k·A·ΔT / d. Bir duvar/katmandan iletimle geçen ısı gücünü (W) verir.
            k değerleri tipik koşullar içindir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Yüzey Alanı" unit="m²" value={area} onChange={setArea} />
            <NumberInput label="Sıcaklık Farkı (ΔT)" unit="°C" value={deltaT} onChange={setDeltaT} />
            <NumberInput label="Kalınlık" unit="mm" value={thickness} onChange={setThickness} />
            <UnitSelect label="Malzeme" value={materialId} options={MATERIAL_OPTIONS} onChange={setMaterialId} />
            {isOzel && (
              <NumberInput label="Isıl İletkenlik (k)" unit="W/m·K" value={customK} onChange={setCustomK} />
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
            caption={`${result.materialLabel}, k = ${formatNumber(result.kUsed)} W/(m·K) — iletimle geçen ısı gücü.`}
          />
          <div>
            <SectionLabel>Isı Akısı</SectionLabel>
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
