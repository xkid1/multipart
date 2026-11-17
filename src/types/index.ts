/**
 * Main types module exports
 * Centralizes all TypeScript type definitions for @xkid1/multipart
 * @module @xkid1/multipart/types
 */

// File data types
export type { FileData } from './file-data/file-data';

// Middleware types
export type {
  ExpressMultipartOptions,
  MiddlewareError,
  MiddlewareOptions,
  MultipartRequestProperties,
  ParsedFormData,
  ParsedMultipartRequest,
} from './middleware';

// Storage types
export type {
  AzureBlobClientInterface,
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  AzureBlobUploadResultInterface,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
  StorageAdapter,
  StorageUploadError,
} from './storage';
