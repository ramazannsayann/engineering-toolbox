import { useState } from 'react';
import {
  convertNumberBase,
  NUMBER_BASES,
  type NumberBase,
} from '../../calculators/computer/sayi-tabani';
import SectionLabel from '../ui/SectionLabel';
import TextInput from '../ui/TextInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult, { type ConversionRow } from '../ui/ConversionResult';

const BASE_OPTIONS = NUMBER_BASES.map((b) => ({ value: String(b.base), label: b.label }));

/**
 * Number base converter island. Computes LIVE as the user types or changes the
 * base (no "Hesapla" button); "Temizle" resets. All conversion is delegated to
 * the pure `convertNumberBase` engine — clipboard lives in CopyButton only.
 */
export default function NumberBaseConverter() {
  const [value, setValue] = useState('255');
  const [fromBase, setFromBase] = useState<NumberBase>(10);

  const result = convertNumberBase({ value, fromBase });
  const isBlank = value.trim() === '';

  function handleClear(): void {
    setValue('');
    setFromBase(10);
  }

  const rows: ConversionRow[] = result.ok
    ? result.rows.map((r) => ({ label: r.label, value: r.value }))
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Sayıyı Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Sayıyı yazın ve tabanını seçin; dört tabandaki karşılığı anında
            görünür. Onaltılık (hex) için harfler büyük veya küçük yazılabilir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Sayı"
              value={value}
              onChange={setValue}
              mono
              placeholder="örn. 255"
              invalid={!isBlank && !result.ok}
            />
            <UnitSelect
              label="Taban"
              value={String(fromBase)}
              options={BASE_OPTIONS}
              onChange={(v) => setFromBase(Number(v) as NumberBase)}
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
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <SectionLabel>Sonuç</SectionLabel>
          <ConversionResult rows={rows} caption={`${result.bitLength} bit`} />
        </div>
      )}
    </div>
  );
}
