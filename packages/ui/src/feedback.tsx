import type { ReactNode } from 'react';
import { Button } from './button.js';
import { StatusBadge, type StatusTone } from './surfaces.js';
import { cx } from './utils.js';

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="uaf-state" role="status" aria-live="polite">
      <span className="uaf-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="uaf-state uaf-state--stacked">
      <div className="uaf-state__title">{title}</div>
      {description ? <div className="uaf-state__description">{description}</div> : null}
      {action ? <div className="uaf-state__action">{action}</div> : null}
    </section>
  );
}

export interface ErrorStateProps extends EmptyStateProps {
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, action, retryLabel = 'Try again', onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={action ?? (onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : undefined)}
    />
  );
}

export type ToastTone = Exclude<StatusTone, 'neutral'>;
export interface ToastProps {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  onDismiss?: () => void;
}

export function Toast({ title, description, tone = 'info', onDismiss }: ToastProps) {
  return (
    <div className={cx('uaf-toast', `uaf-toast--${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="uaf-toast__body">
        <strong>{title}</strong>
        {description ? <div>{description}</div> : null}
      </div>
      {onDismiss ? <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss">×</Button> : null}
    </div>
  );
}

export type SyncDisplayState = 'idle' | 'syncing' | 'offline' | 'pending' | 'attention_required';

const syncPresentation: Record<SyncDisplayState, { label: string; tone: StatusTone; animate: boolean }> = {
  idle: { label: 'Synced', tone: 'success', animate: false },
  syncing: { label: 'Syncing', tone: 'info', animate: true },
  offline: { label: 'Offline', tone: 'warning', animate: false },
  pending: { label: 'Changes pending', tone: 'warning', animate: false },
  attention_required: { label: 'Needs attention', tone: 'danger', animate: false },
};

export function getSyncPresentation(state: SyncDisplayState) {
  return syncPresentation[state];
}

export function SyncStatus({ state, className }: { state: SyncDisplayState; className?: string }) {
  const presentation = getSyncPresentation(state);
  return (
    <StatusBadge tone={presentation.tone} className={cx('uaf-sync-status', className)} aria-live="polite">
      <span
        className={cx('uaf-sync-status__dot', presentation.animate && 'uaf-sync-status__dot--animated')}
        aria-hidden="true"
      />
      {presentation.label}
    </StatusBadge>
  );
}
