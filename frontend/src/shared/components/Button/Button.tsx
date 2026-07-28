// Reusable button component for common AFF actions across pages.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, type = 'button', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={`button button-${variant}`} type={type} {...props}>
      {children}
    </button>
  );
}
