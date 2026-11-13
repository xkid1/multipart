/**
 * @xkid1/multipart - Zero-dependency multipart form-data parser
 *
 * A lightweight, type-safe multipart form-data parser for Node.js.
 * Supports RFC 2046 and RFC 2388 multipart parsing with automatic
 * encoding detection and file extraction.
 *
 * @example
 * ```typescript
 * import multipart from '@xkid1/multipart';
 *
 * const body = Buffer.from('...');
 * const boundary = 'something1234567890';
 * const data = multipart(body, boundary);
 *
 * // data = {
 * //   fieldName: 'string value',
 * //   fileName: {
 * //     name: 'file.txt',
 * //     mimeType: 'text/plain',
 * //     encoding: 'utf-8',
 * //     size: 1024,
 * //     extension: 'txt',
 * //     buffer: Buffer<...>
 * //   }
 * // }
 * ```
 *
 * @module @xkid1/multipart
 */

// Main parser function
export { default as multipart } from '@libs';

// Middleware exports
export { multipartExpress, parseMultipartWithDuplicates } from '@middleware';

// Local storage exports (no external dependencies required)
export {
  deleteFromLocal,
  getLocalFileUrl,
  uploadMultipleToLocal,
  uploadToLocal,
} from './storage/local';

// Utilities (advanced usage)
export {
  encoding,
  extractExtension,
  extractFilename,
  extractMimeType,
  extractName,
  extractPart,
  findNextBoundary,
  Logger,
  MultiPartError,
  parseHeaders,
  shouldSkipPart,
  splitPartSections,
  type LogLevel,
} from '@utils';

// Storage types and handlers and utilities
export type {
  AzureBlobStorageOptions,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
  LocalStorageConfig,
  LocalStorageOptions,
  LocalStorageUploadResponse,
  MiddlewareContext,
  MiddlewareError,
  MiddlewareOptions,
  ParsedFormData,
  S3StorageOptions,
  S3UploadConfig,
  S3UploadResponse,
  StorageUploadError,
  StorageUploadResponse,
} from '@types';
