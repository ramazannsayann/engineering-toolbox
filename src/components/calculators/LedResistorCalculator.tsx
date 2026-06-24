import { useState } from 'react';
import {
  solveLedResistor,
  type LedResistorResult,
} from '../../calculators/electrical/led-direnci';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * LED series-resistor island. Delegates ALL math to the pure `solveLedResistor`
 * engine — no formulas reimplemented here.
 */
export default function LedResistorCalculator() {
  const [supply, setSupply] = useState('');
  const [forward, setForward] = useState('');
  const [current, setCurrent] = useState('');
  const [result, setResult] = useState<LedResistorResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveLedResistor({
        supplyVoltageV: parseField(supply),
        ledForwardVoltageV: parseField(forward),
        ledCurrentMa: parseField(current),
      }),
    );
  }

  function handleClear(): void {
    setSupply('');
    setForward('');
    setCurrent('');
    setResult(null);
  }

  const heroValues: ResultValue[] =
    result && result.ok
      ? [
          { label: 'Hesaplanan Direnç (R)', value: formatNumber(result.values.resistanceOhms), unit: 'Ω' },
          {
            label: 'Önerilen Standart (E24)',
            value: result.values.e24Ohms !== null ? formatNumber(result.values.e24Ohms) : '—',
            unit: result.values.e24Ohms !== null ? 'Ω' : '',
          },
          { label: 'Direnç Gücü (P)', value: formatNumber(result.values.powerW), unit: 'W' },
          {
            label: 'Önerilen Güç',
            value: result.values.powerRatingW !== null ? formatNumber(result.values.powerRatingW) : '> 2',
            unit: 'W',
          },
        ]
      : [];

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
            LED ileri gerilimi renge göre değişir (kırmızı ~1,8–2,2 V; mavi/beyaz
            ~3,0–3,3 V). Tipik ileri akım 20 mA’dır.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput
              label="Besleme Gerilimi (V_kaynak)"
              unit="V"
              value={supply}
              onChange={setSupply}
            />
            <NumberInput
              label="LED İleri Gerilimi (V_LED)"
              unit="V"
              value={forward}
              onChange={setForward}
            />
            <NumberInput
              label="LED İleri Akımı (I_LED)"
              unit="mA"
              value={current}
              onChange={setCurrent}
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
          <ResultCard
            values={heroValues}
            caption="Standart değer E24 serisinden yukarı yuvarlanır; güç değeri hesaplanan dirençten büyük en küçük standart kademedir."
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
