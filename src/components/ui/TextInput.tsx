import { useId } from 'react';

interface TextInputProps {
  /** Field label, e.g. "Sayı". */
  label: string;
  /** Controlled value. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Render the value in JetBrains Mono (for codes, numbers, hashes…). */
  mono?: boolean;
  /** Shows the invalid (red) border treatment. */
  invalid?: boolean;
  /** Optional accessible description / hint id. */
  inputMode?: 'text' | 'numeric' | 'decimal';
}

/**
 * Controlled single-line text input styled as the design's field card: a label
 * on top and a large value below, with the shared focus accent ring. The
 * converter analog of NumberInput; `mono` switches the value to JetBrains Mono.
 */
export default function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  mono = false,
  invalid = false,
  inputMode = 'text',
}: TextInputProps) {
  const id = useId();
  return (
    <div className="field-card p-3.5" data-invalid={invalid ? 'true' : 'false'}>
      <label htmlFor={id} className="mb-2 block text-[12px] text-text-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        className={`w-full border-0 bg-transparent text-[20px] font-semibold tracking-[-0.01em] text-text outline-none placeholder:font-medium placeholder:text-text-faint ${
          mono ? 'font-mono' : ''
        }`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
