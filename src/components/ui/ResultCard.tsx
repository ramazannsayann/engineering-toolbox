import SectionLabel from './SectionLabel';

export interface ResultValue {
  /** Quantity name, e.g. "Direnç". */
  label: string;
  /** Pre-formatted number, e.g. "48". */
  value: string;
  /** Unit, e.g. "Ω". */
  unit: string;
}

interface ResultCardProps {
  values: ResultValue[];
  caption?: string;
}

/**
 * Hero result card: accent gradient + glow, a "Sonuç" label and "hesaplandı"
 * status dot, big accent mono numbers with units, hairline dividers between
 * values, and a faint caption line.
 */
export default function ResultCard({ values, caption }: ResultCardProps) {
  return (
    <div className="result-card p-5">
      <div className="flex items-center justify-between">
        <SectionLabel tone="accent">Sonuç</SectionLabel>
        <span className="flex items-center gap-1.5">
          <span className="status-dot" aria-hidden="true" />
          <span className="mono-label">hesaplandı</span>
        </span>
      </div>
      <div className="mt-4 flex flex-col">
        {values.map((value, index) => (
          <div
            key={value.label}
            className={`flex items-baseline justify-between gap-3 py-3${
              index > 0 ? ' border-t border-hairline' : ''
            }`}
          >
            <span className="text-[13px] text-text-muted">{value.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="result-number">{value.value}</span>
              <span className="result-unit">{value.unit}</span>
            </span>
          </div>
        ))}
      </div>
      {caption && <p className="mt-3 text-[12px] text-text-dim">{caption}</p>}
    </div>
  );
}
