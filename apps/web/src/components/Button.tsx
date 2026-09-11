import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'small' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
};

export function Button({ variant = 'secondary', fullWidth, className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button className={`${variant} ${fullWidth ? 'full-width' : ''} ${className}`.trim()} type={type} {...props}>
      {children}
    </button>
  );
}
