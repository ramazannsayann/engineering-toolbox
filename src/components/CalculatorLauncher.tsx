import { lazy, Suspense, useEffect, useState } from 'react';

/**
 * The heavy calculator (and mathjs, ~650 KB) is split into its own chunk and
 * only fetched the FIRST time the panel opens — `import()` is not evaluated
 * until the lazy element renders. With the panel closed, a page ships only this
 * tiny launcher; mathjs never enters the global bundle.
 */
const ScientificCalculator = lazy(() => import('./calculators/ScientificCalculator'));

function CalcIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <line x1="8.5" y1="6.5" x2="15.5" y2="6.5" />
      <line x1="8.5" y1="11" x2="8.51" y2="11" />
      <line x1="12" y1="11" x2="12.01" y2="11" />
      <line x1="15.5" y1="11" x2="15.51" y2="11" />
      <line x1="8.5" y1="14.5" x2="8.51" y2="14.5" />
      <line x1="12" y1="14.5" x2="12.01" y2="14.5" />
      <line x1="15.5" y1="14.5" x2="15.51" y2="14.5" />
      <line x1="8.5" y1="18" x2="8.51" y2="18" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
      <line x1="15.5" y1="18" x2="15.51" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/**
 * Site-wide floating scientific-calculator launcher. Ships on every page (added
 * to BaseLayout, hydrated client:idle). Renders a fixed corner button + a
 * non-modal slide-in panel; the page behind stays visible and usable. Closes on
 * the X, Escape, or tapping the button again. The panel content (calculator +
 * mathjs) is lazy-loaded on first open only.
 */
export default function CalculatorLauncher() {
  const [open, setOpen] = useState(false);
  // Becomes true on first open and stays true, so the calculator (and its state)
  // is kept mounted-but-hidden afterwards — mathjs still loads only once.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function toggle(): void {
    setOpen((prev) => {
      const next = !prev;
      if (next) setMounted(true);
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        className="calc-fab"
        aria-label={open ? 'Hesap makinesini kapat' : 'Hesap makinesini aç'}
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? <CloseIcon /> : <CalcIcon />}
      </button>

      <aside
        className="calc-panel"
        data-open={open ? 'true' : 'false'}
        role="dialog"
        aria-label="Bilimsel hesap makinesi"
        inert={!open}
      >
        <div className="calc-panel-header">
          <span className="text-[13px] font-semibold text-text">Bilimsel Hesap Makinesi</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Kapat"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[9px] border border-border-strong text-text-muted transition hover:border-accent/50 hover:text-text"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="calc-panel-body">
          {mounted && (
            <Suspense
              fallback={
                <p className="py-10 text-center text-[13px] text-text-muted">
                  Hesap makinesi yükleniyor…
                </p>
              }
            >
              <ScientificCalculator />
            </Suspense>
          )}
        </div>
      </aside>
    </>
  );
}
