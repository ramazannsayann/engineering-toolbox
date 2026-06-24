import CopyButton from './CopyButton';

export interface ConversionRow {
  /** Row label, e.g. "İkilik". */
  label: string;
  /** The converted value, shown in mono and copyable. */
  value: string;
}

interface ConversionResultProps {
  rows: ConversionRow[];
  /** Optional faint footer line, e.g. "8 bit". */
  caption?: string;
}

/**
 * Generic multi-row converter output: the converter analog of ResultCard. Each
 * row shows a muted label, the value in JetBrains Mono (selectable, wraps so
 * long binary strings never break the layout) and a CopyButton. Reused by every
 * computer/transformer tool (base64, hash, IP/subnet, …).
 */
export default function ConversionResult({ rows, caption }: ConversionResultProps) {
  return (
    <div className="ui-card overflow-hidden">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={`px-4 py-3.5${index > 0 ? ' border-t border-hairline' : ''}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] text-text-muted">{row.label}</span>
            <CopyButton value={row.value} />
          </div>
          <p className="mt-1.5 font-mono text-[15px] leading-relaxed break-all text-text select-text">
            {row.value}
          </p>
        </div>
      ))}
      {caption && (
        <p className="border-t border-hairline px-4 py-2.5 text-[12px] text-text-dim">
          {caption}
        </p>
      )}
    </div>
  );
}
