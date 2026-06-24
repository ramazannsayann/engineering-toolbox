interface StepListProps {
  /** Derivation lines from a solver (e.g. solveOhmsLaw's `steps`). */
  steps: readonly string[];
}

/**
 * Renders "Label: expr = result unit" so the formula is mono (#e7eaf0) and the
 * final result figure is accent. Degrades gracefully if a step has no ":"/"=".
 */
function StepText({ step }: { step: string }) {
  const colon = step.indexOf(':');
  const label = colon >= 0 ? step.slice(0, colon) : '';
  const expr = (colon >= 0 ? step.slice(colon + 1) : step).trim();
  const eq = expr.lastIndexOf('=');
  const head = eq >= 0 ? expr.slice(0, eq + 1) : expr;
  const result = eq >= 0 ? expr.slice(eq + 1).trim() : '';
  return (
    <span className="step-text">
      {label && <span>{label}: </span>}
      <span className="font-mono text-text">{head} </span>
      {result && <span className="font-mono text-accent">{result}</span>}
    </span>
  );
}

/** Numbered derivation steps with the accent step-number badge per step. */
export default function StepList({ steps }: StepListProps) {
  if (steps.length === 0) return null;
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="step-badge">{index + 1}</span>
          <StepText step={step} />
        </li>
      ))}
    </ol>
  );
}
