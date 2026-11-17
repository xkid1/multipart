/**
 * Multipart middleware core types
 * @module @xkid1/multipart/types/middleware
 */

import type { FileData } from '../file-data/file-data';

/**
 * Parsed multipart form data with support for multiple files/fields per key
 * - Single value: string or FileData
 * - Multiple values: array of strings or FileData objects
 * @type ParsedFormData
 */
export type ParsedFormData = Record<string, string | FileData | (string | FileData)[]>;

/**
 * Middleware configuration options
 * @interface MiddlewareOptions
 */
export interface MiddlewareOptions {
  /**
   * Maximum allowed body size in bytes (default: 100MB)
   * @default 104857600
   */
  maxSize?: number;

  /**
   * Allowed MIME types for file uploads (default: all). Case-insensitive;
   * a wildcard subtype such as `image/*` is supported.
   * @example ['image/jpeg', 'image/png', 'application/pdf']
   */
  allowedMimeTypes?: string[];

  /**
   * Maximum number of fields (default: 1000)
   * @default 1000
   */
  maxFields?: number;

  /**
   * Maximum number of files (default: 100)
   * @default 100
   */
  maxFiles?: number;

  /**
   * Log a line per parsed field/file (names and sizes only, never values).
   * @default false
   */
  debug?: boolean;

  /**
   * Field size limit in bytes (default: 10MB)
   * @default 10485760
   */
  fieldSize?: number;

  /**
   * File size limit in bytes (default: 50MB)
   * @default 52428800
   */
  fileSize?: number;
}

/**
 * Options for the Express middleware.
 * @interface ExpressMultipartOptions
 */
export interface ExpressMultipartOptions extends MiddlewareOptions {
  /**
   * How parse errors are reported:
   * - `'attach'` (default): set `req.multipartError` and call `next()`, so the
   *   route handler decides how to respond.
   * - `'next'`: call `next(error)` with a {@link MultiPartError} carrying
   *   `statusCode`, for Express error handlers such as `multipartErrorHandler`.
   * @default 'attach'
   */
  onError?: 'attach' | 'next';
}

/**
 * Middleware error information
 * @interface MiddlewareError
 */
export interface MiddlewareError {
  /** Error code; see `MultiPartErrorCode`. */
  code: string;
  message: string;
  statusCode: number;
  field?: string;
  size?: number;
  limit?: number;
}
