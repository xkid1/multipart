/**
 * @xkid1/multipart - Zero-dependency multipart form-data parser
 *
 * A lightweight, type-safe multipart form-data parser for Node.js.
 * Supports RFC 2046 and RFC 2388 multipart parsing with automatic
 * encoding detection and file extraction.
 *
 * @example
 * ```typescript
 * import { multipart } from '@xkid1/multipart';
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
 * //     extension: '.txt',
 * //     buffer: Buffer<...>
 * //   }
 * // }
 * ```
 *
 * @module @xkid1/multipart
 */

// Parsers
export {
  DEFAULT_LIMITS,
  extractBoundary,
  isFileData,
  isMimeTypeAllowed,
  isMultipartFormData,
  multipart,
  parseMultipartWithDuplicates,
  splitFormData,
  type SplitFormData,
} from '@libs';

// Express middleware and framework-agnostic request parsing.
// NestJS lives in '@xkid1/multipart/middleware/nestjs' (it needs @nestjs/common at runtime).
export {
  getField,
  getFile,
  hasFiles,
  multipartErrorHandler,
  multipartExpress,
  parseMultipartRequest,
  readRequestBody,
  toMiddlewareError,
  type RequestLike,
} from '@middleware';

// Local storage (no external dependencies). S3 and Azure: see their subpaths.
export {
  deleteFromLocal,
  existsInLocal,
  getLocalFileUrl,
  LocalStorage,
  uploadMultipleToLocal,
  uploadToLocal,
} from './storage/local';
export {
  buildContentDisposition,
  isStorageError,
  sanitizeFilename,
  type StorageError,
} from './storage/shared';

// Utilities (advanced usage)
export {
  encoding,
  extractExtension,
  extractFilename,
  extractMimeType,
  extractName,
  iterateParts,
  Logger,
  MultiPartError,
  MultiPartErrorCode,
  parseHeaders,
  splitPartSections,
  type LogLevel,
  type MultiPartErrorCodeValue,
  type RawPart,
} from '@utils';

// Types
export type {
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  ExpressMultipartOptions,
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  MiddlewareError,
  MiddlewareOptions,
  MultipartRequestProperties,
  ParsedFormData,
  ParsedMultipartRequest,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
  StorageAdapter,
  StorageUploadError,
} from '@types';
