import { useEffect, useRef, useState } from 'react';

interface CopyButtonProps {
  /** The exact string to place on the clipboard. */
  value: string;
  className?: string;
}

/**
 * Copy `text` to the clipboard. Tries the async Clipboard API first, then falls
 * back to a hidden-textarea + execCommand for older/insecure contexts. Returns
 * false instead of throwing so the caller can no-op gracefully.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    // execCommand is deprecated but remains the only clipboard fallback for
    // insecure/older contexts. Reference it through a local structural type
    // (not `any`) so the deprecation lint doesn't flag this intentional path.
    const legacyExec = (document as { execCommand?: (commandId: string) => boolean })
      .execCommand;
    const ok = legacyExec ? legacyExec.call(document, 'copy') : false;
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15V5a2 2 0 0 1 2-2h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Small clipboard button. Clipboard access lives ONLY here (the island layer),
 * never in the pure engine. Shows brief "Kopyalandı" feedback then reverts.
 */
export default function CopyButton({ value, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy(): Promise<void> {
    const ok = await copyText(value);
    if (!ok) return; // graceful no-op on failure
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Kopyala"
      className={`inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-[8px] border px-2 py-1 text-[11.5px] transition-colors ${
        copied
          ? 'border-accent/50 text-accent'
          : 'border-border text-text-dim hover:border-accent/40 hover:text-accent'
      } ${className}`.trim()}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
    </button>
  );
}
