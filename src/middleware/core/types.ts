import type { FileData } from '@types';

/**
 * Parsed multipart form data with support for multiple files/fields per key
 * - Single value: string or FileData
 * - Multiple values: array of strings or FileData objects
 */
export type ParsedFormData = Record<string, string | FileData | (string | FileData)[]>;

/**
 * Middleware configuration options
 */
export interface MiddlewareOptions {
  /**
   * Maximum allowed body size in bytes (default: 100MB)
   * @default 104857600
   */
  maxSize?: number;

  /**
   * Allowed MIME types for file uploads (default: all)
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
   * Enable debug logging (default: false)
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
 * Middleware error information
 */
export interface MiddlewareError {
  code: string;
  message: string;
  statusCode: number;
  field?: string;
  size?: number;
  limit?: number;
}

/**
 * Middleware context (for Express/NestJS)
 */
export interface MiddlewareContext {
  /**
   * Parsed form data
   */
  body?: ParsedFormData;

  /**
   * Files grouped by field name
   */
  files?: Record<string, FileData | FileData[]>;

  /**
   * Text fields grouped by field name
   */
  fields?: Record<string, string | string[]>;

  /**
   * Middleware configuration
   */
  config: MiddlewareOptions;

  /**
   * Parsing error if any
   */
  error?: MiddlewareError;
}
