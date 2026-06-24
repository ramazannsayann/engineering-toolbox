import { useEffect, useState } from 'react';
import {
  generateUuids,
  type UuidResult,
} from '../../calculators/computer/uuid-uretici';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';
import CopyButton from '../ui/CopyButton';
import { parseField } from './parse';

/**
 * UUID generator island. The pure `generateUuids` engine validates + structures
 * the batch; the randomness source is `crypto.randomUUID()` injected here.
 * Regenerates on count change and on "Yenile".
 */
export default function UuidGenerator() {
  const [count, setCount] = useState('1');
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<UuidResult | null>(null);

  useEffect(() => {
    setResult(generateUuids(parseField(count) ?? NaN, () => crypto.randomUUID()));
  }, [count, nonce]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Ayarlar</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Kaç adet UUID üretileceğini seçin; rastgele v4 UUID’ler tarayıcınızda
            anında oluşturulur.
          </p>
          <div className="mt-3 max-w-[220px]">
            <NumberInput label="Adet" unit="1–50" value={count} onChange={setCount} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" type="button" onClick={() => setNonce((n) => n + 1)}>
            Yenile
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
          <div className="flex items-center justify-between gap-3">
            <SectionLabel tone="accent">UUID</SectionLabel>
            {result.uuids.length > 1 && <CopyButton value={result.uuids.join('\n')} />}
          </div>
          <ConversionResult
            rows={result.uuids.map((uuid, index) => ({
              label: result.uuids.length > 1 ? `#${index + 1}` : 'UUID',
              value: uuid,
            }))}
          />
        </div>
      )}
    </div>
  );
}
