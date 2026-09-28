import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ButtonProps {
  children: ReactNode;
  to: string;
  variant?: 'dark' | 'light' | 'outline';
  className?: string;
  arrow?: boolean;
}

export function Button({ children, to, variant = 'dark', className = '', arrow = true }: ButtonProps) {
  return (
    <Link to={to} className={`button button--${variant} ${className}`.trim()}>
      <span>{children}</span>
      {arrow ? <span className="button-arrow" aria-hidden="true">→</span> : null}
    </Link>
  );
}
