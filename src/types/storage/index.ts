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
  StorageUploadResponse,
} from './config';

export type {
  AzureBlobClientInterface,
  AzureBlobContainerClientInterface,
  AzureBlobPropertiesInterface,
  AzureBlobStorageOptions,
  AzureBlobUploadResultInterface,
  LocalStorageOptions,
  S3ClientInterface,
  S3StorageOptions,
  StorageErrorHandler,
} from './options';
