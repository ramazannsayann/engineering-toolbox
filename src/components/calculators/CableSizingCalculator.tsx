import { useState } from 'react';
import {
  solveCableSizing,
  type CableSizingResult,
  type Insulation,
  type InstallMethod,
} from '../../calculators/electrical/kablo-kesiti';
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

const INSULATION_OPTIONS = [
  { value: 'PVC', label: 'PVC' },
  { value: 'XLPE', label: 'XLPE' },
];

const METHOD_OPTIONS = [
  { value: 'B1', label: 'B1 — Boru/kanal içinde (duvarda)' },
  { value: 'C', label: 'C — Duvara/yüzeye sabitlenmiş (açıkta)' },
  { value: 'E', label: 'E — Serbest havada / kablo merdiveninde' },
];

/**
 * Cable-sizing island. Delegates ALL math (ampacity lookup + voltage drop) to
 * the pure `solveCableSizing` engine — no formulas/tables are reimplemented here.
 */
export default function CableSizingCalculator() {
  const [phase, setPhase] = useState('3');
  const [insulation, setInsulation] = useState('PVC');
  const [method, setMethod] = useState('C');
  const [loadCurrent, setLoadCurrent] = useState('');
  const [voltage, setVoltage] = useState('');
  const [length, setLength] = useState('');
  const [maxDrop, setMaxDrop] = useState('5');
  const [result, setResult] = useState<CableSizingResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveCableSizing({
        phase: phase === '1' ? 1 : 3,
        loadCurrentA: parseField(loadCurrent),
        voltageV: parseField(voltage),
        lengthM: parseField(length),
        insulation: insulation as Insulation,
        method: method as InstallMethod,
        maxVoltageDropPercent: parseField(maxDrop),
      }),
    );
  }

  function handleClear(): void {
    setLoadCurrent('');
    setVoltage('');
    setLength('');
    setMaxDrop('5');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Önerilen Kesit', value: formatNumber(result.values.recommendedMm2), unit: 'mm²' },
          {
            label: 'Gerçek Gerilim Düşümü',
            value: formatNumber(result.values.recommendedDropPercent),
            unit: '%',
          },
        ]
      : [];

  const caption =
    result && result.ok
      ? `Belirleyen kriter: ${result.values.governingCriterion}. Ampasite gerektirdiği: ${formatNumber(result.values.ampacityPickMm2)} mm², gerilim düşümü gerektirdiği: ${formatNumber(result.values.voltageDropPickMm2)} mm². Önerilen kesit ampasitesi: ${formatNumber(result.values.recommendedAmpacityA)} A.`
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
            Bakır iletken, 30 °C ortam, gruplama yok (IEC 60364-5-52). Tek faz = 2
            yüklü iletken, üç faz = 3 yüklü iletken; üç fazda gerilim hat-hat
            değeridir. Gerçek tesisatlarda düzeltme faktörleri gerekebilir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect label="Faz" value={phase} options={PHASE_OPTIONS} onChange={setPhase} />
            <UnitSelect
              label="Yalıtım"
              value={insulation}
              options={INSULATION_OPTIONS}
              onChange={setInsulation}
            />
            <div className="sm:col-span-2">
              <UnitSelect
                label="Döşeme Yöntemi (IEC)"
                value={method}
                options={METHOD_OPTIONS}
                onChange={setMethod}
              />
            </div>
            <NumberInput
              label="Yük Akımı (I)"
              unit="A"
              value={loadCurrent}
              onChange={setLoadCurrent}
            />
            <NumberInput label="Gerilim (V)" unit="V" value={voltage} onChange={setVoltage} />
            <NumberInput label="Hat Uzunluğu (L)" unit="m" value={length} onChange={setLength} />
            <NumberInput
              label="İzin Verilen Gerilim Düşümü"
              unit="%"
              value={maxDrop}
              onChange={setMaxDrop}
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
