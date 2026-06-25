import { useState } from 'react';
import {
  solveWaterHeating,
} from '../../calculators/hvac/su-isitma';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * Water heating power/energy island. Live compute as inputs change; "Temizle"
 * resets. Delegates all physics to the pure `solveWaterHeating` engine; the
 * power breakdown (kW / BTU·h / kcal·h) comes from the shared power-unit helper.
 */
export default function WaterHeatingCalculator() {
  const [volume, setVolume] = useState('100');
  const [deltaT, setDeltaT] = useState('30');
  const [minutes, setMinutes] = useState('60');

  const isBlank =
    volume.trim() === '' || deltaT.trim() === '' || minutes.trim() === '';
  const result = isBlank
    ? null
    : solveWaterHeating({
        volumeL: parseField(volume) ?? NaN,
        deltaT: parseField(deltaT) ?? NaN,
        minutes: parseField(minutes) ?? NaN,
      });

  function handleClear(): void {
    setVolume('');
    setDeltaT('');
    setMinutes('');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Gereken Güç', value: formatNumber(result.powerKW), unit: 'kW' },
          { label: 'Enerji', value: formatNumber(result.energyKWh), unit: 'kWh' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Su için c = 4186 J/(kg·°C), yoğunluk ≈ 1 kg/L varsayılmıştır. ΔT,
            ulaşılmak istenen sıcaklık ile başlangıç sıcaklığı arasındaki farktır.
            Süre, suyun bu sürede ısıtılması için gereken ortalama gücü verir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Su Hacmi" unit="L" value={volume} onChange={setVolume} />
            <NumberInput label="Sıcaklık Farkı (ΔT)" unit="°C" value={deltaT} onChange={setDeltaT} />
            <NumberInput label="Süre" unit="dk" value={minutes} onChange={setMinutes} />
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
            caption="Suyu istenen sıcaklığa belirtilen sürede ısıtmak için gereken ortalama güç ve toplam enerji."
          />
          <div>
            <SectionLabel>Güç Birimleri</SectionLabel>
            <div className="mt-3">
              <ConversionResult
                rows={result.powerRows.map((row) => ({ label: row.label, value: row.value }))}
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
