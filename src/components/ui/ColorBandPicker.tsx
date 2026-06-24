import {
  type BandCount,
  type ResistorColor,
  bandLayout,
  bandLabels,
  validColorsFor,
  COLOR_NAME_TR,
} from '../../calculators/electrical/direnc-renk-kodu';

/**
 * Real resistor swatch colours. Black/white get a slightly lifted value plus a
 * border (added in the markup) so both stay visible on the dark theme.
 */
const SWATCH_HEX: Record<ResistorColor, string> = {
  black: '#15181d',
  brown: '#7a4a24',
  red: '#d23b2f',
  orange: '#e6791f',
  yellow: '#f2c200',
  green: '#2fa84f',
  blue: '#2f5fd2',
  violet: '#8a4fd2',
  grey: '#9aa0a6',
  white: '#f4f5f7',
  gold: '#caa53d',
  silver: '#c4c8cc',
};

interface ColorBandPickerProps {
  mode: BandCount;
  /** Selected colour per band, length === mode. */
  colors: readonly ResistorColor[];
  /** Set the colour at a band index. */
  onChange: (index: number, color: ResistorColor) => void;
}

/** Layout for the resistor preview: value bands cluster left, tolerance right. */
function bandX(index: number, mode: BandCount): number {
  const valueBands = mode - 1; // digits + multiplier
  if (index < valueBands) return 88 + index * 24;
  return 232; // tolerance band, set apart on the right
}

/**
 * Resistor colour-band picker. Shows a live resistor preview plus, for each
 * band, a row of clickable swatches limited to the colours valid at that
 * position. Selection is fully controlled by the parent (live compute, no
 * submit button). Each swatch carries its Turkish colour name for a11y.
 */
export default function ColorBandPicker({
  mode,
  colors,
  onChange,
}: ColorBandPickerProps) {
  const layout = bandLayout(mode);
  const labels = bandLabels(mode);
  const combination = colors.map((c) => COLOR_NAME_TR[c]).join(' – ');

  return (
    <div className="flex flex-col gap-4">
      {/* Live resistor preview */}
      <div className="field-card flex items-center justify-center p-4">
        <svg
          viewBox="0 0 320 120"
          className="h-auto w-full max-w-[420px]"
          role="img"
          aria-label={`Direnç önizlemesi: ${combination}`}
        >
          {/* Leads */}
          <line x1="6" y1="60" x2="78" y2="60" stroke="#8b9099" strokeWidth="3" />
          <line x1="242" y1="60" x2="314" y2="60" stroke="#8b9099" strokeWidth="3" />
          {/* Body */}
          <rect
            x="70"
            y="38"
            width="180"
            height="44"
            rx="14"
            fill="#d8c79f"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="1"
          />
          {/* Bands */}
          {colors.map((color, index) => {
            const x = bandX(index, mode);
            return (
              <rect
                key={index}
                x={x}
                y="38"
                width="12"
                height="44"
                fill={SWATCH_HEX[color]}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="0.75"
              />
            );
          })}
        </svg>
      </div>

      {/* Selected combination (text) */}
      <p className="text-[12.5px] text-text-muted">
        Seçilen:{' '}
        <span className="font-mono text-text">{combination}</span>
      </p>

      {/* Swatch rows, one per band */}
      <div className="flex flex-col gap-3.5">
        {layout.map((kind, index) => {
          const valid = validColorsFor(kind);
          const selected = colors[index];
          return (
            <div key={index} role="group" aria-label={labels[index]}>
              <span className="mono-label">{labels[index]}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {valid.map((color) => {
                  const isActive = color === selected;
                  return (
                    <button
                      key={color}
                      type="button"
                      title={COLOR_NAME_TR[color]}
                      aria-label={COLOR_NAME_TR[color]}
                      aria-pressed={isActive}
                      onClick={() => onChange(index, color)}
                      className={`h-7 w-7 cursor-pointer rounded-[6px] border border-border-strong transition-transform hover:scale-110${
                        isActive
                          ? ' ring-2 ring-accent ring-offset-2 ring-offset-surface'
                          : ''
                      }`}
                      style={{ backgroundColor: SWATCH_HEX[color] }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
