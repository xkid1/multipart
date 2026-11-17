/**
 * Main types module exports
 * Centralizes all TypeScript type definitions for @xkid1/multipart
 * @module @xkid1/multipart/types
 */

// File data types
export type { FileData, UploadedFile } from './file-data/file-data.js';

// Middleware types
export type {
  ExpressMultipartOptions,
  MiddlewareContext,
  MiddlewareError,
  MiddlewareOptions,
  MultipartRequestProperties,
  ParsedFormData,
  ParsedMultipartRequest,
} from './middleware/index.js';

// Storage types
export type {
  AzureBlobClientInterface,
  AzureBlobContainerClientInterface,
  AzureBlobPropertiesInterface,
  AzureBlobStorageOptions,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  AzureBlobUploadResultInterface,
  LocalStorageConfig,
  LocalStorageOptions,
  LocalStorageUploadResponse,
  S3ClientInterface,
  S3StorageOptions,
  S3UploadConfig,
  S3UploadResponse,
  StorageAdapter,
  StorageErrorHandler,
  StorageUploadError,
  StorageUploadResponse,
} from './storage/index.js';
