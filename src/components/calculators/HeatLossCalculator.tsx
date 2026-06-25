import { useState } from 'react';
import {
  solveHeatLoss,
  type HeatLossResult,
  type Insulation,
  type Exposure,
} from '../../calculators/hvac/isi-kaybi';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import ConversionResult from '../ui/ConversionResult';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const MODE_OPTIONS = [
  { value: 'simple', label: 'Basit' },
  { value: 'detailed', label: 'Detaylı' },
];
const INSULATION_OPTIONS = [
  { value: 'iyi', label: 'İyi' },
  { value: 'orta', label: 'Orta' },
  { value: 'zayif', label: 'Zayıf' },
];
const EXPOSURE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'kose', label: 'Köşe / Dış Cephe' },
];

/**
 * Heat-loss / heating-load island. A Basit/Detaylı toggle swaps the visible
 * inputs; BOTH feed the single pure `solveHeatLoss` engine (Simple = Detailed
 * with default assumptions, so the magnitude stays consistent). The result is a
 * preliminary estimate — a prominent disclaimer is always shown.
 */
export default function HeatLossCalculator() {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const [area, setArea] = useState('20');
  const [ceiling, setCeiling] = useState('2.7');
  const [deltaT, setDeltaT] = useState('30');
  // Detailed-only (defaults match the engine's Simple defaults → consistent).
  const [insulation, setInsulation] = useState<Insulation>('orta');
  const [windowArea, setWindowArea] = useState('0');
  const [exposure, setExposure] = useState<Exposure>('normal');

  const detailed = mode === 'detailed';
  const isBlank =
    area.trim() === '' ||
    ceiling.trim() === '' ||
    deltaT.trim() === '' ||
    (detailed && windowArea.trim() === '');

  let result: HeatLossResult | null = null;
  if (!isBlank) {
    result = detailed
      ? solveHeatLoss({
          mode: 'detailed',
          areaM2: parseField(area) ?? NaN,
          ceilingM: parseField(ceiling) ?? NaN,
          deltaT: parseField(deltaT) ?? NaN,
          insulation,
          windowAreaM2: parseField(windowArea) ?? NaN,
          exposure,
        })
      : solveHeatLoss({
          mode: 'simple',
          areaM2: parseField(area) ?? NaN,
          ceilingM: parseField(ceiling) ?? NaN,
          deltaT: parseField(deltaT) ?? NaN,
        });
  }

  function handleClear(): void {
    setArea('');
    setCeiling('2.7');
    setDeltaT('30');
    setInsulation('orta');
    setWindowArea('0');
    setExposure('normal');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Isıtma Yükü', value: formatNumber(result.kW), unit: 'kW' },
          { label: 'Isı Kaybı', value: formatNumber(result.kcalPerH), unit: 'kcal/saat' },
          { label: 'Toplam Güç', value: formatNumber(result.totalW), unit: 'W' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Mod ve Mekân Bilgileri</SectionLabel>
          <div className="mt-3 max-w-[220px]">
            <UnitSelect
              label="Hesaplama Modu"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(v) => setMode(v === 'detailed' ? 'detailed' : 'simple')}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Mekân Alanı" unit="m²" value={area} onChange={setArea} />
            <NumberInput label="Tavan Yüksekliği" unit="m" value={ceiling} onChange={setCeiling} />
            <NumberInput label="İç-Dış Sıcaklık Farkı (ΔT)" unit="°C" value={deltaT} onChange={setDeltaT} />
            {detailed && (
              <>
                <UnitSelect
                  label="Yalıtım"
                  value={insulation}
                  options={INSULATION_OPTIONS}
                  onChange={(v) => setInsulation(v as Insulation)}
                />
                <NumberInput label="Pencere Alanı" unit="m²" value={windowArea} onChange={setWindowArea} />
                <UnitSelect
                  label="Konum (Cephe)"
                  value={exposure}
                  options={EXPOSURE_OPTIONS}
                  onChange={(v) => setExposure(v as Exposure)}
                />
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

      <div className="rounded-[11px] border border-border-strong bg-surface-sunken px-4 py-3 text-[12.5px] leading-relaxed text-text-muted">
        Bu sonuç bir <span className="text-text">ön tahmindir</span>; kesin ısıtma sistemi seçimi için
        TS 825 esaslı profesyonel bir ısı kaybı hesabı yaptırın. Kullanılan katsayılar
        (0,5 W/m³·K taban, pencere 3 W/m²·K, yalıtım ve köşe düzeltmeleri) tipik koşullar içindir;
        gerçek yük iklime, dış tasarım sıcaklığına, yalıtıma ve yapıya göre değişir.
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
            caption="Isıtma yükü; radyatör/kazan seçiminde kcal/saat değeri yaygın olarak kullanılır."
          />
          <div>
            <SectionLabel>Güç Birimleri</SectionLabel>
            <div className="mt-3">
              <ConversionResult
                rows={result.rows.map((row) => ({ label: row.label, value: row.value }))}
              />
            </div>
          </div>
          {detailed && (
            <div>
              <SectionLabel>Yük Dağılımı</SectionLabel>
              <div className="ui-card mt-3 overflow-hidden">
                {result.breakdown.map((item, index) => (
                  <div
                    key={item.label}
                    className={`flex items-baseline justify-between gap-3 px-4 py-2.5${
                      index > 0 ? ' border-t border-hairline' : ''
                    }`}
                  >
                    <span className="text-[12.5px] text-text-muted">{item.label}</span>
                    <span className="font-mono text-[13px] text-text">{formatNumber(item.watts)} W</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
