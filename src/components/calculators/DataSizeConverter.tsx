import { useState } from 'react';
import { convertDataSize, DATA_UNITS } from '../../calculators/computer/veri-boyutu';
import SectionLabel from '../ui/SectionLabel';
import TextInput from '../ui/TextInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';

const UNIT_OPTIONS = DATA_UNITS.map((u) => ({ value: u.id, label: u.label }));

/**
 * Data size converter island. Computes LIVE as the user types or changes the
 * unit (no "Hesapla" button); "Temizle" resets. Conversion is delegated to the
 * pure `convertDataSize` engine; results are grouped by system (SI / IEC / bit),
 * each group rendered as a SectionLabel + the shared ConversionResult.
 */
export default function DataSizeConverter() {
  const [value, setValue] = useState('1');
  const [fromUnitId, setFromUnitId] = useState('MB');

  const result = convertDataSize({ value, fromUnitId });
  const isBlank = value.trim() === '';

  function handleClear(): void {
    setValue('');
    setFromUnitId('MB');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Değer Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Bir değer yazın ve birimini seçin; ondalık (SI), ikilik (IEC) ve bit
            karşılıkları anında görünür. Ondalık ayraç olarak nokta veya virgül
            kullanabilirsiniz.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Değer"
              value={value}
              onChange={setValue}
              mono
              inputMode="decimal"
              placeholder="örn. 1"
              invalid={!isBlank && !result.ok}
            />
            <UnitSelect
              label="Birim"
              value={fromUnitId}
              options={UNIT_OPTIONS}
              onChange={setFromUnitId}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
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
          {result.groups.map((group) => (
            <div key={group.system} className="flex flex-col gap-3">
              <SectionLabel>{group.system}</SectionLabel>
              <ConversionResult
                rows={group.rows.map((row) => ({ label: row.label, value: row.value }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
