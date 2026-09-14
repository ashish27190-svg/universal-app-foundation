import type { ReactNode } from 'react';
import { cx } from './utils.js';

export interface HeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Header({ title, subtitle, leading, actions, className }: HeaderProps) {
  return (
    <header className={cx('uaf-header', className)}>
      {leading ? <div className="uaf-header__leading">{leading}</div> : null}
      <div className="uaf-header__body">
        <div className="uaf-header__title">{title}</div>
        {subtitle ? <div className="uaf-header__subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="uaf-header__actions">{actions}</div> : null}
    </header>
  );
}

export interface BottomNavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface BottomNavigationProps {
  items: BottomNavigationItem[];
  ariaLabel?: string;
}

export function BottomNavigation({ items, ariaLabel = 'Primary navigation' }: BottomNavigationProps) {
  return (
    <nav className="uaf-bottom-nav" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          className={cx('uaf-bottom-nav__item', item.active && 'uaf-bottom-nav__item--active')}
          type="button"
          aria-current={item.active ? 'page' : undefined}
          disabled={item.disabled}
          onClick={item.onSelect}
        >
          {item.icon ? <span className="uaf-bottom-nav__icon" aria-hidden="true">{item.icon}</span> : null}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
