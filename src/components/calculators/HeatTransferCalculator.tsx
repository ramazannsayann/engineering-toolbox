import { useState } from 'react';
import {
  solveHeatTransfer,
  SPECIFIC_HEATS,
  OZEL_ID,
  type HeatTransferResult,
} from '../../calculators/thermal/isi-transferi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const MATERIAL_OPTIONS = SPECIFIC_HEATS.map((m) => ({
  value: m.id,
  label: m.c === null ? m.label : `${m.label} (c = ${m.c})`,
}));

/**
 * Heat-transfer (Q = m·c·ΔT) island. The user enters a mass and ΔT and picks a
 * material; selecting "Özel" reveals a custom specific-heat input. Live compute;
 * "Temizle" resets. All physics is delegated to the pure `solveHeatTransfer`.
 */
export default function HeatTransferCalculator() {
  const [mass, setMass] = useState('1');
  const [deltaT, setDeltaT] = useState('80');
  const [materialId, setMaterialId] = useState('su');
  const [customC, setCustomC] = useState('500');

  const isOzel = materialId === OZEL_ID;
  const isBlank =
    mass.trim() === '' || deltaT.trim() === '' || (isOzel && customC.trim() === '');

  let result: HeatTransferResult | null = null;
  if (!isBlank) {
    result = solveHeatTransfer({
      massKg: parseField(mass) ?? NaN,
      deltaT: parseField(deltaT) ?? NaN,
      materialId,
      ...(isOzel ? { customC: parseField(customC) ?? NaN } : {}),
    });
  }

  function handleClear(): void {
    setMass('');
    setDeltaT('80');
    setMaterialId('su');
    setCustomC('500');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Isı Enerjisi', value: formatNumber(result.kJ), unit: 'kJ' },
          { label: 'Enerji (kWh)', value: formatNumber(result.kWh), unit: 'kWh' },
          { label: 'Enerji (kcal)', value: formatNumber(result.kcal), unit: 'kcal' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Q = m · c · ΔT. Maddeyi seçin; öz ısı değeri otomatik kullanılır. ΔT,
            başlangıç ile hedef sıcaklık arasındaki farktır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Kütle" unit="kg" value={mass} onChange={setMass} />
            <NumberInput label="Sıcaklık Farkı (ΔT)" unit="°C" value={deltaT} onChange={setDeltaT} />
            <UnitSelect
              label="Malzeme"
              value={materialId}
              options={MATERIAL_OPTIONS}
              onChange={setMaterialId}
            />
            {isOzel && (
              <NumberInput label="Öz Isı (c)" unit="J/kg·°C" value={customC} onChange={setCustomC} />
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
        Öz ısı değerleri tipik oda sıcaklığı içindir; maddenin saflığına ve
        sıcaklığa göre az miktarda değişebilir.
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
            caption={`${result.materialLabel} için c = ${formatNumber(result.cUsed)} J/(kg·°C) kullanıldı.`}
          />
          <div>
            <SectionLabel>Enerji Birimleri</SectionLabel>
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
