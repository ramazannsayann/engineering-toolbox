import { useEffect, useRef, useState } from 'react';
import { computeHashes, type HashResult } from '../../calculators/computer/hash';
import SectionLabel from '../ui/SectionLabel';
import TextArea from '../ui/TextArea';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';

/**
 * Hash calculator island — the project's FIRST async compute path. As the user
 * types, each change starts an async `computeHashes` tagged with an incrementing
 * id; when a computation resolves it is applied ONLY if it is still the latest
 * request (latest-wins), so fast typing can never show a stale/mismatched hash.
 */
export default function HashCalculator() {
  const [input, setInput] = useState('abc');
  const [result, setResult] = useState<HashResult | null>(null);
  const latestId = useRef(0);

  useEffect(() => {
    const id = ++latestId.current;
    let active = true;
    void computeHashes(input).then((res) => {
      // Discard stale results: apply only if this is still the latest request.
      if (active && id === latestId.current) setResult(res);
    });
    return () => {
      active = false;
    };
  }, [input]);

  function handleClear(): void {
    setInput('');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Metin</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Metni yazın; MD5, SHA-1, SHA-256 ve SHA-512 özetleri anında hesaplanır
            (UTF-8, Türkçe karakter ve emoji destekli).
          </p>
          <div className="mt-3">
            <TextArea
              label="Girdi"
              value={input}
              onChange={setInput}
              placeholder="Özetlenecek metni yazın…"
            />
          </div>
          <p className="mt-2 text-[12px] text-text-faint">
            Not: MD5 ve SHA-1 güvenlik (parola, dijital imza) için önerilmez;
            yalnızca checksum/uyumluluk amaçlıdır. Güvenlik için SHA-256 veya
            SHA-512 kullanın.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" type="button" onClick={handleClear}>
            Temizle
          </Button>
        </div>
      </div>

      {result && !result.ok && (
        <p className="error-note" role="alert">
          {result.error.message}
        </p>
      )}

      {result && result.ok && (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <SectionLabel tone="accent">Özetler</SectionLabel>
          <ConversionResult
            rows={result.rows.map((row) => ({ label: row.label, value: row.value }))}
          />
        </div>
      )}
    </div>
  );
}
