import { useEffect, useState } from 'react';
import {
  generatePassword,
  type PasswordResult,
  type RandomInt,
} from '../../calculators/computer/sifre-uretici';
import SectionLabel from '../ui/SectionLabel';
import NumberInput from '../ui/NumberInput';
import Button from '../ui/Button';
import ConversionResult from '../ui/ConversionResult';
import { parseField } from './parse';

/**
 * Crypto-backed unbiased integer in [0, maxExclusive) via rejection sampling
 * (discard bytes in the biased tail so each value is equally likely). maxExclusive
 * never exceeds 128 here, so a single byte suffices.
 */
const cryptoRandomInt: RandomInt = (maxExclusive) => {
  if (maxExclusive <= 1) return 0;
  const limit = Math.floor(256 / maxExclusive) * maxExclusive;
  const buf = new Uint8Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % maxExclusive;
};

/** Honest, simple strength label from entropy ≈ length · log2(poolSize). */
function strengthLabel(poolSize: number, length: number): string {
  const bits = length * Math.log2(poolSize);
  if (bits < 40) return 'Zayıf';
  if (bits < 70) return 'Orta';
  if (bits < 100) return 'Güçlü';
  return 'Çok güçlü';
}

interface ToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

function Toggle({ label, active, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`cursor-pointer rounded-[9px] border px-3 py-2 text-[13px] transition-colors ${
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-border text-text-muted hover:border-border-strong'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Password generator island. The deterministic structure (pool, guarantees,
 * shuffle) comes from the pure `generatePassword` engine; the randomness is the
 * crypto-backed `cryptoRandomInt` injected here. Regenerates on any option change
 * and on "Yenile". Nothing is stored or transmitted.
 */
export default function PasswordGenerator() {
  const [length, setLength] = useState('16');
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<PasswordResult | null>(null);

  useEffect(() => {
    setResult(
      generatePassword(
        { length: parseField(length) ?? NaN, upper, lower, digits, symbols },
        cryptoRandomInt,
      ),
    );
    // nonce drives "Yenile"; the rest regenerate as options change.
  }, [length, upper, lower, digits, symbols, nonce]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <div>
          <SectionLabel>Ayarlar</SectionLabel>
          <p className="mt-1.5 text-[12.5px] text-text-dim">
            Uzunluğu ve karakter türlerini seçin; şifre anında üretilir. Şifre
            tarayıcınızda kriptografik rastgelelikle oluşturulur ve hiçbir yere
            gönderilmez.
          </p>
          <div className="mt-3 max-w-[220px]">
            <NumberInput label="Uzunluk" unit="4–128" value={length} onChange={setLength} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Toggle label="Büyük harf (A-Z)" active={upper} onToggle={() => setUpper((v) => !v)} />
            <Toggle label="Küçük harf (a-z)" active={lower} onToggle={() => setLower((v) => !v)} />
            <Toggle label="Rakam (0-9)" active={digits} onToggle={() => setDigits((v) => !v)} />
            <Toggle label="Sembol (!@#…)" active={symbols} onToggle={() => setSymbols((v) => !v)} />
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
          <SectionLabel tone="accent">Şifre</SectionLabel>
          <ConversionResult
            rows={[{ label: 'Şifre', value: result.password }]}
            caption={`Güç: ${strengthLabel(result.poolSize, result.password.length)} • ${result.poolSize} karakterlik havuz • tarayıcıda üretildi, hiçbir yere gönderilmedi.`}
          />
        </div>
      )}
    </div>
  );
}
