import { createAppError, type AppError } from '@uaf/core';

export function repositoryNotFound(): AppError {
  return createAppError({
    code: 'DATA-001',
    category: 'storage',
    severity: 'error',
    userMessage: 'The requested record was not found.',
    retryable: false,
  });
}

export function repositoryRevisionConflict(expected: number, actual: number): AppError {
  return createAppError({
    code: 'DATA-002',
    category: 'conflict',
    severity: 'warning',
    userMessage: 'This record changed elsewhere and needs to be refreshed before saving.',
    retryable: false,
    technicalContext: { expectedRevision: expected, actualRevision: actual },
  });
}

export function repositoryDuplicateId(): AppError {
  return createAppError({
    code: 'DATA-003',
    category: 'storage',
    severity: 'error',
    userMessage: 'A record with this identity already exists.',
    retryable: false,
  });
}

export function repositoryWorkspaceMismatch(): AppError {
  return createAppError({
    code: 'DATA-004',
    category: 'permission',
    severity: 'error',
    userMessage: 'This record does not belong to the selected workspace.',
    retryable: false,
  });
}

export function repositoryInvalidLifecycle(message: string): AppError {
  return createAppError({
    code: 'DATA-005',
    category: 'validation',
    severity: 'warning',
    userMessage: message,
    retryable: false,
  });
}
