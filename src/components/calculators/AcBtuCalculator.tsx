import { useState } from 'react';
import {
  solveAcBtu,
  type AcBtuResult,
  type Orientation,
  type Insulation,
} from '../../calculators/hvac/klima-btu';
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
const SUN_OPTIONS = [
  { value: 'no', label: 'Hayır' },
  { value: 'yes', label: 'Evet' },
];
const ORIENTATION_OPTIONS = [
  { value: 'kuzey', label: 'Kuzey' },
  { value: 'dogu', label: 'Doğu' },
  { value: 'bati', label: 'Batı' },
  { value: 'guney', label: 'Güney' },
];
const INSULATION_OPTIONS = [
  { value: 'iyi', label: 'İyi' },
  { value: 'orta', label: 'Orta' },
  { value: 'zayif', label: 'Zayıf' },
];

/**
 * AC cooling load / BTU island. A Basit/Detaylı toggle swaps the visible inputs;
 * BOTH feed the single pure `solveAcBtu` engine (Simple = Detailed with default
 * assumptions, so the magnitude stays consistent). The result is a preliminary
 * estimate — a prominent disclaimer is always shown.
 */
export default function AcBtuCalculator() {
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const [area, setArea] = useState('20');
  const [ceiling, setCeiling] = useState('2.7');
  const [people, setPeople] = useState('2');
  const [sun, setSun] = useState('no');
  // Detailed-only (defaults match the engine's Simple defaults → consistent).
  const [deviceW, setDeviceW] = useState('300');
  const [windowArea, setWindowArea] = useState('2');
  const [orientation, setOrientation] = useState<Orientation>('guney');
  const [insulation, setInsulation] = useState<Insulation>('orta');

  const detailed = mode === 'detailed';
  const isBlank =
    area.trim() === '' ||
    ceiling.trim() === '' ||
    people.trim() === '' ||
    (detailed && (deviceW.trim() === '' || windowArea.trim() === ''));

  const highSun = sun === 'yes';
  let result: AcBtuResult | null = null;
  if (!isBlank) {
    result = detailed
      ? solveAcBtu({
          mode: 'detailed',
          areaM2: parseField(area) ?? NaN,
          ceilingM: parseField(ceiling) ?? NaN,
          people: parseField(people) ?? NaN,
          highSun,
          deviceW: parseField(deviceW) ?? NaN,
          windowAreaM2: parseField(windowArea) ?? NaN,
          windowOrientation: orientation,
          insulation,
        })
      : solveAcBtu({
          mode: 'simple',
          areaM2: parseField(area) ?? NaN,
          ceilingM: parseField(ceiling) ?? NaN,
          people: parseField(people) ?? NaN,
          highSun,
        });
  }

  function handleClear(): void {
    setArea('');
    setCeiling('2.7');
    setPeople('2');
    setSun('no');
    setDeviceW('300');
    setWindowArea('2');
    setOrientation('guney');
    setInsulation('orta');
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          {
            label: 'Önerilen Klima',
            value: result.recommendedBtu !== null ? String(result.recommendedBtu) : '> 48000',
            unit: 'BTU',
          },
          { label: 'Hesaplanan Yük', value: formatNumber(result.btuPerHour), unit: 'BTU/saat' },
          { label: 'Soğutma Gücü', value: formatNumber(result.kW), unit: 'kW' },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Mod ve Oda Bilgileri</SectionLabel>
          <div className="mt-3 max-w-[220px]">
            <UnitSelect
              label="Hesaplama Modu"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(v) => setMode(v === 'detailed' ? 'detailed' : 'simple')}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Oda Alanı" unit="m²" value={area} onChange={setArea} />
            <NumberInput label="Tavan Yüksekliği" unit="m" value={ceiling} onChange={setCeiling} />
            <NumberInput label="Kişi Sayısı" unit="kişi" value={people} onChange={setPeople} />
            <UnitSelect label="Çok Güneş Alıyor mu?" value={sun} options={SUN_OPTIONS} onChange={setSun} />
            {detailed && (
              <>
                <NumberInput label="Cihaz & Aydınlatma" unit="W" value={deviceW} onChange={setDeviceW} />
                <NumberInput label="Pencere Alanı" unit="m²" value={windowArea} onChange={setWindowArea} />
                <UnitSelect
                  label="Pencere Yönü"
                  value={orientation}
                  options={ORIENTATION_OPTIONS}
                  onChange={(v) => setOrientation(v as Orientation)}
                />
                <UnitSelect
                  label="Yalıtım"
                  value={insulation}
                  options={INSULATION_OPTIONS}
                  onChange={(v) => setInsulation(v as Insulation)}
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
        Bu sonuç bir <span className="text-text">ön tahmindir</span>; kesin klima seçimi için
        profesyonel bir ısı kazancı/iklimlendirme hesabı yaptırın. Kullanılan katsayılar
        (≈35 W/m³ taban, kişi başı 100 W, pencere 60 W/m²) tipik koşullar içindir ve gerçek yük
        iklim, yön, yalıtım ve kullanıma göre değişir.
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
            caption={
              result.note ??
              'Önerilen kapasite, hesaplanan yükün üzerindeki en yakın standart klima değeridir.'
            }
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
