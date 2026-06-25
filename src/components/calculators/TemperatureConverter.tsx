import { useState } from 'react';
import {
  convertTemperature,
  TEMP_UNITS,
  type TempUnit,
} from '../../calculators/general/sicaklik';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';
import { parseField } from './parse';

const UNIT_OPTIONS = TEMP_UNITS.map((u) => ({ value: u.id, label: u.label }));

function abbr(unitId: string): string {
  const label = TEMP_UNITS.find((u) => u.id === unitId)?.label ?? '';
  return label.match(/\(([^)]+)\)\s*$/)?.[1] ?? '';
}

/**
 * Temperature converter island. Live compute; "Temizle" resets. Delegates to the
 * pure `convertTemperature` engine (offset math, absolute-zero guard). Negative
 * temperatures above absolute zero are valid, so there is no "negatif" guard —
 * only the engine's absolute-zero error surfaces.
 */
export default function TemperatureConverter() {
  const [value, setValue] = useState('100');
  const [fromUnit, setFromUnit] = useState<TempUnit>('C');

  const parsed = parseField(value);
  const result = parsed === undefined ? null : convertTemperature({ value: parsed, fromUnit });
  const isBlank = value.trim() === '';

  function handleClear(): void {
    setValue('');
    setFromUnit('C');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Sıcaklık Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Bir değer yazın ve birimini seçin; diğer iki birimdeki karşılığı anında
            görünür. Mutlak sıfırın (−273,15 °C) altındaki değerler kabul edilmez.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="Değer" unit={abbr(fromUnit)} value={value} onChange={setValue} />
            <UnitSelect
              label="Birim"
              value={fromUnit}
              options={UNIT_OPTIONS}
              onChange={(v) => setFromUnit(v as TempUnit)}
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
