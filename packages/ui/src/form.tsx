import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './utils.js';

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean | undefined;
  helperText?: ReactNode | undefined;
  error?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function FormField({ label, htmlFor, required, helperText, error, children, className }: FormFieldProps) {
  return (
    <div className={cx('uaf-field', Boolean(error) && 'uaf-field--error', className)}>
      <label className="uaf-field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="uaf-field__required" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? (
        <div className="uaf-field__message uaf-field__message--error" role="alert">
          {error}
        </div>
      ) : helperText ? (
        <div className="uaf-field__message">{helperText}</div>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={cx('uaf-input', invalid && 'uaf-input--invalid', className)}
      aria-invalid={invalid || undefined}
    />
  );
});

export type NumberInputProps = Omit<TextInputProps, 'type'>;
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(props, ref) {
  return <TextInput {...props} ref={ref} type="number" inputMode={props.inputMode ?? 'decimal'} />;
});

export type DateInputProps = Omit<TextInputProps, 'type'>;
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(props, ref) {
  return <TextInput {...props} ref={ref} type="date" />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      className={cx('uaf-input', 'uaf-select', invalid && 'uaf-input--invalid', className)}
      aria-invalid={invalid || undefined}
    >
      {children}
    </select>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cx('uaf-input', 'uaf-textarea', invalid && 'uaf-input--invalid', className)}
      aria-invalid={invalid || undefined}
    />
  );
});

export interface LabeledTextInputProps extends TextInputProps {
  label: string;
  helperText?: ReactNode | undefined;
  error?: ReactNode | undefined;
}

export const LabeledTextInput = forwardRef<HTMLInputElement, LabeledTextInputProps>(function LabeledTextInput(
  { id, label, required, helperText, error, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FormField label={label} htmlFor={inputId} required={required} helperText={helperText} error={error}>
      <TextInput {...props} id={inputId} ref={ref} required={required} invalid={Boolean(error)} />
    </FormField>
  );
});
