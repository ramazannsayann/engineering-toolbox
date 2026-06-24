import { useId } from 'react';

interface TextAreaProps {
  /** Field label, e.g. "Metin". */
  label: string;
  /** Controlled value. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Render the value in JetBrains Mono (default ON for text/code tools). */
  mono?: boolean;
  /** Shows the invalid (red) border treatment. */
  invalid?: boolean;
  /** Read-only (e.g. for an output box). */
  readOnly?: boolean;
  /** Minimum height in px (textarea is vertically resizable). */
  minHeight?: number;
}

/**
 * Controlled multi-line text field styled as the design's field card: a label
 * on top and a resizable textarea below sharing the focus accent ring. The
 * text-tool analog of TextInput; reused by Base64 / Hash / URL / JSON tools.
 */
export default function TextArea({
  label,
  value,
  onChange,
  placeholder = '',
  mono = true,
  invalid = false,
  readOnly = false,
  minHeight = 120,
}: TextAreaProps) {
  const id = useId();
  return (
    <div className="field-card p-3.5" data-invalid={invalid ? 'true' : 'false'}>
      <label htmlFor={id} className="mb-2 block text-[12px] text-text-muted">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        style={{ minHeight: `${minHeight}px` }}
        className={`block w-full resize-y border-0 bg-transparent text-[14px] leading-relaxed text-text outline-none placeholder:text-text-faint ${
          mono ? 'font-mono' : ''
        }`}
      />
    </div>
  );
}
