import { MultiPartError } from '../../utils/index.js';

import type { StorageUploadError } from '../../types/index.js';

/** An Error thrown by the storage helpers, carrying the {@link StorageUploadError} fields. */
export type StorageError = MultiPartError & StorageUploadError;

/** Get a readable message from any thrown value. */
export const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : fallback;
};

/** Read a string property from an unknown error object (e.g. Node's `code`). */
export const stringProp = (error: unknown, key: string): string | undefined => {
  const value = (error as Record<string, unknown> | null)?.[key];
  return typeof value === 'string' ? value : undefined;
};

/**
 * Build a throwable storage error. Every storage helper throws this shape, so
 * callers can rely on `code`, `statusCode`, `filename` and `details` being present.
 */
export const createStorageError = (
  info: StorageUploadError,
  cause?: unknown,
): StorageError => {
  const error = new MultiPartError(info.message, info.code, {
    statusCode: info.statusCode,
    cause,
  }) as StorageError;
  error.filename = info.filename;
  error.details = info.details;
  return error;
};

/** Narrow a caught value to a {@link StorageError}. */
export const isStorageError = (error: unknown): error is StorageError =>
  error instanceof MultiPartError && typeof error.code === 'string';
