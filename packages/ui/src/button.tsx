import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from './utils.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = 'Loading',
    disabled,
    leadingIcon,
    trailingIcon,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={cx('uaf-button', `uaf-button--${variant}`, `uaf-button--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="uaf-spinner uaf-spinner--inline" aria-hidden="true" /> : leadingIcon}
      <span>{loading ? loadingLabel : children}</span>
      {!loading && trailingIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leadingIcon' | 'trailingIcon'> {
  label: string;
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, className, ...props },
  ref,
) {
  return (
    <Button
      {...props}
      ref={ref}
      className={cx('uaf-icon-button', className)}
      aria-label={label}
      title={props.title ?? label}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
});
