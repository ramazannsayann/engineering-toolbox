import { useState } from 'react';
import { convertLength, LENGTH_UNITS } from '../../calculators/general/uzunluk';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';
import { parseField } from './parse';

const UNIT_OPTIONS = LENGTH_UNITS.map((u) => ({ value: u.id, label: u.label }));

/** Short abbreviation from a label like "Metre (m)" → "m". */
function abbr(unitId: string): string {
  const label = LENGTH_UNITS.find((u) => u.id === unitId)?.label ?? '';
  return label.match(/\(([^)]+)\)/)?.[1] ?? '';
}

/**
 * Length converter island. Computes LIVE as the value or unit changes (no
 * "Hesapla" button); "Temizle" resets to the empty-prompt state. Conversion is
 * delegated to the pure `convertLength` engine (built on the shared linear
 * engine); results are derived in render, so they never go stale.
 */
export default function LengthConverter() {
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('m');

  const parsed = parseField(value); // undefined when blank, number (maybe NaN) otherwise
  const result = parsed === undefined ? null : convertLength(parsed, fromUnit);
  const isBlank = value.trim() === '';

  function handleClear(): void {
    setValue('');
    setFromUnit('m');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değer Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Bir değer yazın ve birimini seçin; diğer tüm uzunluk birimlerindeki
            karşılığı anında görünür. Ondalık ayraç olarak nokta veya virgül
            kullanabilirsiniz.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Değer" unit={abbr(fromUnit)} value={value} onChange={setValue} />
            <UnitSelect
              label="Birim"
              value={fromUnit}
              options={UNIT_OPTIONS}
              onChange={setFromUnit}
            />
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
          Bir değer girin.
        </p>
      )}
      {!isBlank && result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}
      {!isBlank && result && result.ok && (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <SectionLabel>Sonuç</SectionLabel>
          <ConversionResult
            rows={result.rows.map((row) => ({ label: row.label, value: row.value }))}
          />
        </div>
      )}
    </div>
  );
}
