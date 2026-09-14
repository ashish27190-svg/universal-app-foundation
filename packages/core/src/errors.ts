export type AppErrorCategory =
  | 'validation'
  | 'network'
  | 'sync'
  | 'auth'
  | 'permission'
  | 'storage'
  | 'import'
  | 'calculation'
  | 'integration'
  | 'conflict'
  | 'configuration'
  | 'unknown';

export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  readonly code: string;
  readonly category: AppErrorCategory;
  readonly severity: AppErrorSeverity;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly recoveryAction?: string;
  readonly technicalContext?: Readonly<Record<string, unknown>>;
}

export function createAppError(error: AppError): AppError {
  return Object.freeze({ ...error });
}
