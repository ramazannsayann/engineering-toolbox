import { useState } from 'react';
import {
  solveTransformerSizing,
  type TransformerSizingResult,
} from '../../calculators/electrical/trafo-boyutlandirma';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ResultCard, { type ResultValue } from '../ui/ResultCard';
import StepList from '../ui/StepList';
import { formatNumber, parseField } from './parse';

/**
 * Transformer (kVA) sizing island. Delegates ALL math to the pure
 * `solveTransformerSizing` engine — no formulas reimplemented here.
 */
export default function TransformerSizingCalculator() {
  const [loadPower, setLoadPower] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [margin, setMargin] = useState('25');
  const [result, setResult] = useState<TransformerSizingResult | null>(null);

  function handleCalculate(): void {
    setResult(
      solveTransformerSizing({
        loadPowerKw: parseField(loadPower),
        powerFactor: parseField(powerFactor),
        marginPercent: parseField(margin),
      }),
    );
  }

  function handleClear(): void {
    setLoadPower('');
    setPowerFactor('');
    setMargin('25');
    setResult(null);
  }

  let heroValues: ResultValue[] = [];
  let caption = '';
  if (result && result.ok) {
    const { recommendedStandardKva, requiredKva, loadApparentKva } = result.values;
    const required: ResultValue = {
      label: 'Gereken Güç',
      value: formatNumber(requiredKva),
      unit: 'kVA',
    };
    const load: ResultValue = {
      label: 'Yük Gücü (pay öncesi)',
      value: formatNumber(loadApparentKva),
      unit: 'kVA',
    };
    if (recommendedStandardKva !== null) {
      heroValues = [
        { label: 'Önerilen Standart Kademe', value: formatNumber(recommendedStandardKva), unit: 'kVA' },
        required,
        load,
      ];
      caption = 'Gereken güce eşit/büyük en küçük standart trafo kademesi önerildi.';
    } else {
      heroValues = [required, load];
      caption =
        'Gereken güç, kapsanan en büyük standart kademeyi (2500 kVA) aşıyor; paralel trafo veya özel boyutlandırma gerekir.';
    }
  }

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
            Görünür güç boyutlandırması fazdan bağımsızdır. Standart kademeler
            yaygın IEC dağıtım trafosu güçleridir (25…2500 kVA).
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Yük Gücü (P)" unit="kW" value={loadPower} onChange={setLoadPower} />
            <NumberInput
              label="Güç Faktörü (cosφ)"
              unit="–"
              value={powerFactor}
              onChange={setPowerFactor}
            />
            <NumberInput
              label="Emniyet Payı"
              unit="%"
              value={margin}
              onChange={setMargin}
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
