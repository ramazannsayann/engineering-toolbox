import { useState } from 'react';
import {
  processJson,
  JSON_MODES,
  JSON_INDENTS,
  type JsonMode,
  type JsonIndent,
} from '../../calculators/computer/json-formatla';
import SectionLabel from '../ui/SectionLabel';
import TextArea from '../ui/TextArea';
import UnitSelect from '../ui/UnitSelect';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';

const MODE_OPTIONS = JSON_MODES.map((m) => ({ value: m.id, label: m.label }));
const INDENT_OPTIONS = JSON_INDENTS.map((i) => ({ value: i.id, label: i.label }));

const DEFAULT_INPUT = '{"a":1,"b":[2,3]}';

/**
 * JSON formatter/minifier island. Computes LIVE as the user types or changes
 * mode/indent (no "Hesapla" button); "Temizle" resets to the empty prompt
 * state. Result is derived in render from the pure `processJson` engine — no
 * stored state, so it never goes stale; empty input shows a gentle prompt.
 */
export default function JsonFormatter() {
  const [mode, setMode] = useState<JsonMode>('format');
  const [indent, setIndent] = useState<JsonIndent>('2');
  const [input, setInput] = useState(DEFAULT_INPUT);

  const result = processJson({ value: input, mode, indent });

  function handleClear(): void {
    setInput('');
    setMode('format');
    setIndent('2');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Mod ve JSON</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            JSON metnini okunabilir biçimde formatlayın veya tek satıra küçültün;
            sonuç anında güncellenir. Hatalı JSON için satır/sütun bilgisiyle
            Türkçe uyarı gösterilir. (Girinti yalnızca “Formatla” modunda kullanılır.)
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UnitSelect
              label="Mod"
              value={mode}
              options={MODE_OPTIONS}
              onChange={(v) => setMode(v as JsonMode)}
            />
            <UnitSelect
              label="Girinti"
              value={indent}
              options={INDENT_OPTIONS}
              onChange={(v) => setIndent(v as JsonIndent)}
            />
          </div>
          <div className="mt-3">
            <TextArea
              label="JSON"
              value={input}
              onChange={setInput}
              invalid={!result.ok && input.trim() !== ''}
              placeholder='Örn. {"ad":"Dünya","liste":[1,2,3]}'
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
          <div className="flex items-center justify-between gap-3">
            <SectionLabel tone="accent">Sonuç</SectionLabel>
            <CopyButton value={result.output} />
          </div>
          <TextArea
            label={mode === 'minify' ? 'Küçültülmüş JSON' : 'Formatlanmış JSON'}
            value={result.output}
            onChange={() => {}}
            readOnly
            minHeight={160}
          />
        </div>
      )}
    </div>
  );
}
