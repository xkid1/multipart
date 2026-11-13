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

// Types
export type { FileData } from '@types';

// Utilities (advanced usage)
export {
  encoding,
  MultiPartError,
  Logger,
  type LogLevel,
  findNextBoundary,
  extractPart,
  shouldSkipPart,
  splitPartSections,
  parseHeaders,
  extractName,
  extractFilename,
  extractMimeType,
  extractExtension,
} from '@utils';

// Middleware exports
export * from './middleware/index';
