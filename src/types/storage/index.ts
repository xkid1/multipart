/**
 * Storage types module exports
 * @module @xkid1/multipart/types/storage
 */

export type {
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  S3UploadConfig,
  S3UploadResponse,
  StorageUploadError,
} from './config';

export type {
  AzureBlobClientInterface,
  AzureBlobContainerClientInterface,
  AzureBlobUploadResultInterface,
  S3ClientInterface,
} from './options';

export type { StorageAdapter } from './adapter';
