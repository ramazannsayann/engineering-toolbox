import { useState } from 'react';
import {
  convertColor,
  COLOR_FORMATS,
  type ColorFormat,
} from '../../calculators/computer/renk-donusturucu';
import SectionLabel from '../ui/SectionLabel';
import TextInput from '../ui/TextInput';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';

const FORMAT_OPTIONS = COLOR_FORMATS.map((f) => ({ value: f.id, label: f.label }));

/**
 * Color converter island. Computes LIVE as the value or format changes (no
 * "Hesapla" button); "Temizle" resets. Conversion is delegated to the pure
 * `convertColor` engine. Shows a preview swatch (the canonical RGB) plus the
 * copyable HEX/RGB/HSL rows, and a native picker that fills the HEX value.
 */
export default function ColorConverter() {
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [value, setValue] = useState('#3498DB');

  const result = convertColor({ value, fromFormat: format });
  const isBlank = value.trim() === '';

  function handleClear(): void {
    setValue('');
    setFormat('hex');
  }

  function handlePick(hex: string): void {
    setValue(hex.toUpperCase());
    setFormat('hex');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Renk Gir</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Bir renk değeri yazın ve formatını seçin; HEX, RGB ve HSL karşılıkları
            anında görünür. HEX için kısa yazım (#ABC) ve “#” olmadan giriş de
            kabul edilir. (Yalnızca opak renkler; alfa/şeffaflık desteklenmez.)
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Renk Değeri"
              value={value}
              onChange={setValue}
              mono
              placeholder="örn. #3498DB"
              invalid={!isBlank && !result.ok}
            />
            <UnitSelect
              label="Format"
              value={format}
              options={FORMAT_OPTIONS}
              onChange={(v) => setFormat(v as ColorFormat)}
            />
          </div>
          <label className="mt-3 inline-flex items-center gap-2.5 text-[12.5px] text-text-muted">
            <input
              type="color"
              value={result.ok ? result.hex.toLowerCase() : '#000000'}
              onChange={(event) => handlePick(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded-[8px] border border-border-strong bg-transparent"
              aria-label="Renk seçici"
            />
            Renk seçiciyi kullanın
          </label>
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
          <div className="flex items-center gap-3.5">
            <div
              className="h-14 w-14 flex-none rounded-[12px] border border-border-strong"
              style={{ backgroundColor: result.hex }}
              aria-hidden="true"
            />
            <div className="text-[12px] text-text-muted">
              Önizleme
              <div className="mt-0.5 font-mono text-[15px] text-text">{result.hex}</div>
            </div>
          </div>
          <ConversionResult
            rows={result.rows.map((row) => ({ label: row.label, value: row.value }))}
          />
        </div>
      )}
    </div>
  );
}
