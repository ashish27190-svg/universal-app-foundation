import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './utils.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...props }: CardProps) {
  return <div {...props} className={cx('uaf-card', interactive && 'uaf-card--interactive', className)} />;
}

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function ListRow({ title, subtitle, leading, trailing, className, ...props }: ListRowProps) {
  return (
    <div {...props} className={cx('uaf-list-row', className)}>
      {leading ? <div className="uaf-list-row__leading">{leading}</div> : null}
      <div className="uaf-list-row__body">
        <div className="uaf-list-row__title">{title}</div>
        {subtitle ? <div className="uaf-list-row__subtitle">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="uaf-list-row__trailing">{trailing}</div> : null}
    </div>
  );
}

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusBadge({ tone = 'neutral', className, ...props }: StatusBadgeProps) {
  return <span {...props} className={cx('uaf-status-badge', `uaf-status-badge--${tone}`, className)} />;
}
