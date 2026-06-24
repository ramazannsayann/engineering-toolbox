import { useId } from 'react';

interface NumberInputProps {
  /** Field label, e.g. "Gerilim". */
  label: string;
  /** Static unit shown in the top-right badge, e.g. "V". */
  unit: string;
  /** Controlled value (kept as a string so the field can be empty). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** When true, shows the invalid (red) border treatment. */
  invalid?: boolean;
}

/**
 * Editable controlled numeric field styled as the design's field card: a label
 * + a static unit badge on top, and a big mono value below. Uses a real <input>
 * associated with its <label> for accessibility.
 */
export default function NumberInput({
  label,
  unit,
  value,
  onChange,
  placeholder = '—',
  invalid = false,
}: NumberInputProps) {
  const id = useId();
  return (
    <div className="field-card p-3.5" data-invalid={invalid ? 'true' : 'false'}>
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={id} className="text-[12px] text-text-muted">
          {label}
        </label>
        <span className="unit-badge">{unit}</span>
      </div>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className="field-input mt-2.5"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
