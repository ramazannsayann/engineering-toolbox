import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  /** "accent" tints it cyan (used for the result label). */
  tone?: 'default' | 'accent';
  className?: string;
}

/** Tiny uppercase mono label (e.g. "BİLİNEN DEĞERLER", "SONUÇ"). */
export default function SectionLabel({
  children,
  tone = 'default',
  className = '',
}: SectionLabelProps) {
  return (
    <span
      className={`mono-label${className ? ` ${className}` : ''}`}
      style={tone === 'accent' ? { color: 'var(--color-accent)' } : undefined}
    >
      {children}
    </span>
  );
}
