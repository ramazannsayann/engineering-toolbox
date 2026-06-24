import { useState } from 'react';
import {
  convertLinear,
  type LinearUnit,
} from '../../calculators/general/linear-convert';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';
import { parseField } from './parse';

interface LinearConverterProps {
  /** The unit list (serializable) — passed from each tool's engine. */
  units: readonly LinearUnit[];
  /** The unit selected on load. */
  defaultUnitId: string;
}

/** Short abbreviation from the LAST "(...)" in a label, e.g.
 *  "ABD Galonu (gal)" → "gal", "Kilometre/saat (km/s)" → "km/s". */
function abbr(units: readonly LinearUnit[], unitId: string): string {
  const label = units.find((u) => u.id === unitId)?.label ?? '';
  return label.match(/\(([^)]+)\)\s*$/)?.[1] ?? '';
}

/**
 * Generic linear-unit converter island, shared by the weight/area/volume/speed
 * (and any future linear) tools. Same UX as LengthConverter — value + unit
 * picker, live compute, copyable rows, gentle empty prompt, Temizle — but driven
 * entirely by the `units` + `defaultUnitId` props so one component serves all.
 * All math is delegated to the pure `convertLinear` engine.
 */
export default function LinearConverter({ units, defaultUnitId }: LinearConverterProps) {
  const [value, setValue] = useState('1');
  const [fromUnit, setFromUnit] = useState(defaultUnitId);

  const unitOptions = units.map((u) => ({ value: u.id, label: u.label }));
  const parsed = parseField(value); // undefined when blank, number (maybe NaN) otherwise
  const result = parsed === undefined ? null : convertLinear(parsed, fromUnit, units);
  const isBlank = value.trim() === '';

  function handleClear(): void {
    setValue('');
    setFromUnit(defaultUnitId);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değer Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Bir değer yazın ve birimini seçin; diğer tüm birimlerdeki karşılığı
            anında görünür. Ondalık ayraç olarak nokta veya virgül kullanabilirsiniz.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput
              label="Değer"
              unit={abbr(units, fromUnit)}
              value={value}
              onChange={setValue}
            />
            <UnitSelect
              label="Birim"
              value={fromUnit}
              options={unitOptions}
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
