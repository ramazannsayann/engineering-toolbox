import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = accent fill + glow; secondary = subtle surface. */
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

/** Real <button>, styled per the design tokens. */
export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const variantClass = variant === 'primary' ? 'btn-accent' : 'btn-secondary';
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 px-4 py-2.5 text-sm select-none disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
