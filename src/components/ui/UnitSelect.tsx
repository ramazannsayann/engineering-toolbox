import { useId } from 'react';

export interface UnitOption {
  value: string;
  label: string;
}

interface UnitSelectProps {
  label: string;
  value: string;
  options: UnitOption[];
  onChange: (value: string) => void;
}

/**
 * Reusable unit dropdown for tools that need selectable units, styled to match
 * the field card. The Ohm's Law calculator uses static unit badges instead, so
 * this is built for future tools (kept minimal on purpose).
 */
export default function UnitSelect({
  label,
  value,
  options,
  onChange,
}: UnitSelectProps) {
  const id = useId();
  return (
    <div className="field-card p-3.5">
      <label htmlFor={id} className="mb-2 block text-[12px] text-text-muted">
        {label}
      </label>
      <select
        id={id}
        className="w-full bg-transparent font-mono text-[15px] text-text outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-text">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
