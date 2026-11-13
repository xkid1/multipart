/**
 * Storage middleware options types
 * @module @xkid1/multipart/types/storage
 */

import type {
  AzureBlobUploadConfig,
  LocalStorageConfig,
  S3UploadConfig,
  StorageUploadError,
} from './config';

/**
 * Error handler function signature - accepts StorageUploadError or Error
 */
export type StorageErrorHandler = (
  error: StorageUploadError | Error,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res: any,
) => void;

/**
 * Local storage options for middleware
 * @interface LocalStorageOptions
 */
export interface LocalStorageOptions {
  /** Local storage configuration */
  config: LocalStorageConfig;

  /** Field name(s) to upload (default: all files) */
  fields?: string[];

  /** Optional error handler */
  onError?: StorageErrorHandler;
}

/**
 * S3 client interface - properties used in upload operations
 */
export interface S3ClientInterface {
  /** Send method for executing commands */
  send(command: unknown): Promise<unknown>;
}

/**
 * S3 storage options for middleware
 * @interface S3StorageOptions
 */
export interface S3StorageOptions {
  /** S3 upload configuration */
  config: S3UploadConfig;

  /** S3Client instance from @aws-sdk/client-s3 */
  s3Client: S3ClientInterface;

  /** Field name(s) to upload to S3 (default: all files) */
  fields?: string[];

  /** Optional error handler */
  onError?: StorageErrorHandler;
}

/**
 * Azure Blob Container Client interface - properties used in upload operations
 */
export interface AzureBlobContainerClientInterface {
  /** Container name property */
  containerName: string;

  /** Get block blob client for blob operations */
  getBlockBlobClient(blobName: string): AzureBlobClientInterface;
}

/**
 * Azure Blob Client interface - properties used in upload operations
 */
export interface AzureBlobClientInterface {
  /** Blob URL property */
  url: string;

  /** Upload blob data */
  upload(
    data: Buffer | ArrayBuffer | Uint8Array,
    length: number,
    options?: Record<string, unknown>,
  ): Promise<AzureBlobUploadResultInterface>;

  /** Get blob properties */
  getProperties(): Promise<AzureBlobPropertiesInterface>;

  /** Delete the blob */
  delete(): Promise<void>;
}

/**
 * Azure Blob upload result interface
 */
export interface AzureBlobUploadResultInterface {
  /** ETag of the uploaded blob */
  etag?: string;

  /** Last modified timestamp */
  lastModified?: Date;

  /** Version ID if applicable */
  versionId?: string;
}

/**
 * Azure Blob properties interface
 */
export interface AzureBlobPropertiesInterface {
  /** ETag of the blob */
  etag?: string;

  /** Last modified timestamp */
  lastModified?: Date;

  /** Encryption scope if set */
  encryptionScope?: string;

  /** Access tier (Hot, Cool, Archive) */
  accessTier?: string;
}

/**
 * Azure Blob Storage options for middleware
 * @interface AzureBlobStorageOptions
 */
export interface AzureBlobStorageOptions {
  /** Azure Blob upload configuration */
  config: AzureBlobUploadConfig;

  /** BlobContainerClient instance from @azure/storage-blob */
  containerClient: AzureBlobContainerClientInterface;

  /** Field name(s) to upload to Azure (default: all files) */
  fields?: string[];

  /** Optional error handler */
  onError?: StorageErrorHandler;
}
