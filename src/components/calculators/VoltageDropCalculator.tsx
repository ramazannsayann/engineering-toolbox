import { useState } from 'react';
import {
  solveVoltageDrop,
  STANDARD_CROSS_SECTIONS_MM2,
  type VoltageDropResult,
} from '../../calculators/electrical/gerilim-dusumu';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

const PHASE_OPTIONS = [
  { value: '3', label: '3 faz' },
  { value: '1', label: '1 faz' },
];

const CROSS_SECTION_OPTIONS = STANDARD_CROSS_SECTIONS_MM2.map((section) => ({
  value: String(section),
  label: `${section} mm²`,
}));

/**
 * Voltage-drop island. Delegates ALL math to the pure `solveVoltageDrop` engine
 * — no formulas are reimplemented here.
 */
export default function VoltageDropCalculator() {
  const [phase, setPhase] = useState('3');
  const [voltage, setVoltage] = useState('');
  const [current, setCurrent] = useState('');
  const [length, setLength] = useState('');
  const [crossSection, setCrossSection] = useState('2.5');
  const [result, setResult] = useState<VoltageDropResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveVoltageDrop({
        phase: phase === '1' ? 1 : 3,
        voltage: parseField(voltage),
        current: parseField(current),
        length: parseField(length),
        crossSection: parseField(crossSection),
      }),
    );
  }

  function handleClear(): void {
    setVoltage('');
    setCurrent('');
    setLength('');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Yüzde Düşüm', value: formatNumber(result.values.dropPercent), unit: '%' },
          { label: 'Gerilim Düşümü (ΔU)', value: formatNumber(result.values.voltageDrop), unit: 'V' },
        ]
      : [];

  const caption =
    result && result.ok
      ? `Yük ucundaki gerilim ≈ ${formatNumber(result.values.loadVoltage)} V. Tipik sınır: aydınlatma %3, diğer devreler %5 (IEC 60364).`
      : '';

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleCalculate();
        }}
      >
        <div>
          <SectionLabel>Değerleri Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            İletken bakırdır. Üç fazda gerilim hat-hat (line-to-line) değeridir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect
              label="Faz"
              value={phase}
              options={PHASE_OPTIONS}
              onChange={setPhase}
            />
            <UnitSelect
              label="İletken Kesiti (Bakır)"
              value={crossSection}
              options={CROSS_SECTION_OPTIONS}
              onChange={setCrossSection}
            />
            <NumberInput label="Gerilim (V)" unit="V" value={voltage} onChange={setVoltage} />
            <NumberInput label="Akım (I)" unit="A" value={current} onChange={setCurrent} />
            <NumberInput
              label="Hat Uzunluğu (L)"
              unit="m"
              value={length}
              onChange={setLength}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" type="submit">
            Hesapla
          </Button>
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </form>

      {result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-5" role="status" aria-live="polite">
          <ResultCard values={heroValues} caption={caption} />
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
