import { useState } from 'react';
import {
  decodeResistor,
  formatResistanceParts,
  type BandCount,
  type ResistorColor,
} from '../../calculators/electrical/direnc-renk-kodu';
import SectionLabel from '../ui/SectionLabel';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ColorBandPicker from '../ui/ColorBandPicker';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber } from './parse';

const MODE_OPTIONS = [
  { value: '4', label: '4 Bant' },
  { value: '5', label: '5 Bant' },
];

/** Sensible defaults per mode (each is also a documented anchor value). */
const DEFAULT_COLORS: Record<BandCount, ResistorColor[]> = {
  4: ['yellow', 'violet', 'red', 'gold'], // 4.7 kΩ ±5%
  5: ['brown', 'black', 'black', 'red', 'brown'], // 10 kΩ ±1%
};

/**
 * Resistor colour-code island. Unlike the other tools this computes LIVE as the
 * bands change (no "Hesapla" button); "Sıfırla" restores the defaults. All maths
 * is delegated to the pure `decodeResistor` engine.
 */
export default function ResistorColorCalculator() {
  const [mode, setMode] = useState<BandCount>(4);
  const [colors, setColors] = useState<ResistorColor[]>(DEFAULT_COLORS[4]);

  const result = decodeResistor(mode, colors);

  function handleModeChange(value: string): void {
    const next: BandCount = value === '5' ? 5 : 4;
    setMode(next);
    setColors(DEFAULT_COLORS[next]);
  }

  function handleColorChange(index: number, color: ResistorColor): void {
    setColors((prev) => prev.map((c, i) => (i === index ? color : c)));
  }

  function handleReset(): void {
    setColors(DEFAULT_COLORS[mode]);
  }

  const heroValues: ResultValue[] = result.ok
    ? [
        (() => {
          const parts = formatResistanceParts(result.resistanceOhms);
          return { label: 'Direnç Değeri', value: parts.value, unit: parts.unit };
        })(),
        { label: 'Tolerans', value: `±${formatNumber(result.tolerancePercent)}`, unit: '%' },
        (() => {
          const parts = formatResistanceParts(result.minOhms);
          return { label: 'En Düşük', value: parts.value, unit: parts.unit };
        })(),
        (() => {
          const parts = formatResistanceParts(result.maxOhms);
          return { label: 'En Yüksek', value: parts.value, unit: parts.unit };
        })(),
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Bant Sayısı</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Renk bantlarını soldan sağa seçin; sonuç anında güncellenir. Her bant
            için yalnızca o konumda geçerli renkler gösterilir.
          </p>
          <div className="mt-3 max-w-[220px]">
            <UnitSelect
              label="Bant Sayısı"
              value={String(mode)}
              options={MODE_OPTIONS}
              onChange={handleModeChange}
            />
          </div>
        </div>

        <div>
          <SectionLabel>Renk Bantları</SectionLabel>
          <div className="mt-3">
            <ColorBandPicker mode={mode} colors={colors} onChange={handleColorChange} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleReset}>
            Sıfırla
          </Button>
        </div>
      </div>

      {!result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}

      {result.ok && (
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <ResultCard
            values={heroValues}
            caption={`${mode} bantlı direnç • tolerans aralığı renk bantlarından hesaplandı.`}
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
