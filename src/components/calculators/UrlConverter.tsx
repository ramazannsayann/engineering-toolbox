import { useState } from 'react';
import {
  convertUrl,
  URL_MODES,
  URL_TARGETS,
  type UrlMode,
  type UrlTarget,
} from '../../calculators/computer/url-encode';
import SectionLabel from '../ui/SectionLabel';
import TextArea from '../ui/TextArea';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';

const MODE_OPTIONS = URL_MODES.map((m) => ({ value: m.id, label: m.label }));
const TARGET_OPTIONS = URL_TARGETS.map((t) => ({ value: t.id, label: t.label }));

/**
 * URL encode/decode island. Computes LIVE as the user types or changes
 * mode/target (no "Hesapla" button); "Temizle" resets and "Yönü değiştir" feeds
 * the output back as input with the mode flipped. All logic is delegated to the
 * pure `convertUrl` engine; clipboard lives in CopyButton only.
 */
export default function UrlConverter() {
  const [mode, setMode] = useState<UrlMode>('encode');
  const [target, setTarget] = useState<UrlTarget>('component');
  const [input, setInput] = useState('merhaba dünya & ?');

  const result = convertUrl({ value: input, mode, target });

  function handleClear(): void {
    setInput('');
    setMode('encode');
    setTarget('component');
  }

  function handleSwap(): void {
    if (!result.ok) return;
    setInput(result.output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  }

  const outputLabel = mode === 'encode' ? 'URL Kodlu' : 'Çözülmüş Metin';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Mod ve Metin</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Metni URL (yüzde) kodlamasına çevirin veya geri çözün; sonuç anında
            güncellenir. “Bileşen” tek bir parametre değerini, “Tam URL” bir
            adresin yapısını koruyarak kodlar. UTF-8 (Türkçe) desteklenir.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect
              label="Mod"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(v) => setMode(v as UrlMode)}
            />
            <UnitSelect
              label="Hedef"
              value={target}
              options={TARGET_OPTIONS}
              onChange={(v) => setTarget(v as UrlTarget)}
            />
          </div>
          <div className="mt-3">
            <TextArea
              label={mode === 'encode' ? 'Metin' : 'URL Kodlu Metin'}
              value={input}
              onChange={setInput}
              invalid={!result.ok && input.trim() !== ''}
              placeholder={
                mode === 'encode'
                  ? 'Kodlanacak metni yazın…'
                  : 'Çözülecek URL kodlu metni yapıştırın…'
              }
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
