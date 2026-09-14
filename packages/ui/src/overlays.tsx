import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { Button } from './button.js';
import { cx } from './utils.js';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = 'Close',
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="uaf-dialog__overlay" />
        <DialogPrimitive.Content className={cx('uaf-dialog__content', className)}>
          <div className="uaf-dialog__header">
            <div>
              <DialogPrimitive.Title className="uaf-dialog__title">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="uaf-dialog__description">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="sm" aria-label={closeLabel}>×</Button>
            </DialogPrimitive.Close>
          </div>
          <div className="uaf-dialog__body">{children}</div>
          {footer ? <div className="uaf-dialog__footer">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface BottomSheetProps extends DialogProps {}

export function BottomSheet(props: BottomSheetProps) {
  return <Dialog {...props} className={cx('uaf-bottom-sheet', props.className)} />;
}
