import { useState } from 'react';
import {
  convertBase64,
  type Base64Mode,
} from '../../calculators/computer/base64';
import SectionLabel from '../ui/SectionLabel';
import TextArea from '../ui/TextArea';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';

const MODE_OPTIONS = [
  { value: 'encode', label: 'Kodla (Encode)' },
  { value: 'decode', label: 'Çöz (Decode)' },
];

/**
 * Base64 encode/decode island. Computes LIVE as the user types or switches mode
 * (no "Hesapla" button); "Temizle" resets and "Yönü değiştir" feeds the output
 * back as input with the mode flipped. All math is delegated to the pure
 * `convertBase64` engine; clipboard lives in CopyButton only.
 */
export default function Base64Converter() {
  const [mode, setMode] = useState<Base64Mode>('encode');
  const [input, setInput] = useState('Merhaba Dünya');

  const result = convertBase64({ value: input, mode });

  function handleClear(): void {
    setInput('');
    setMode('encode');
  }

  function handleSwap(): void {
    if (!result.ok) return;
    setInput(result.output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  }

  const outputLabel = mode === 'encode' ? 'Base64' : 'Metin';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Mod ve Metin</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Metni Base64’e kodlayın veya Base64’ü geri çözün; sonuç anında
            güncellenir. UTF-8 (Türkçe karakter ve emoji) desteklenir.
          </p>
          <div className="mt-3 max-w-[260px]">
            <UnitSelect
              label="Mod"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(v) => setMode(v as Base64Mode)}
            />
          </div>
          <div className="mt-3">
            <TextArea
              label={mode === 'encode' ? 'Metin' : 'Base64'}
              value={input}
              onChange={setInput}
              invalid={!result.ok && input.trim() !== ''}
              placeholder={mode === 'encode' ? 'Kodlanacak metni yazın…' : 'Çözülecek Base64 metnini yapıştırın…'}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
          <Button variant="secondary" type="button" onClick={handleSwap} disabled={!result.ok}>
            Yönü değiştir
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
          <div className="flex items-center justify-between gap-3">
            <SectionLabel tone="accent">Sonuç</SectionLabel>
            <CopyButton value={result.output} />
          </div>
          <TextArea label={outputLabel} value={result.output} onChange={() => {}} readOnly />
        </div>
      )}
    </div>
  );
}
