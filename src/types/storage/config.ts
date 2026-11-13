/**
 * Storage configuration and response types for uploads
 * Supports local filesystem, AWS S3, and Azure Blob Storage
 * @module @xkid1/multipart/storage
 */

/**
 * Local filesystem storage configuration
 * @interface LocalStorageConfig
 */
export interface LocalStorageConfig {
  /** Local directory path for storing files */
  directory: string;

  /** Optional subdirectory prefix */
  prefix?: string;

  /** Optional chmod permissions (default: 0o644) */
  permissions?: number;

  /** Whether to preserve original filename (default: true) */
  preserveFilename?: boolean;
}

/**
 * S3 upload configuration options
 * @interface S3UploadConfig
 */
export interface S3UploadConfig {
  /** AWS S3 bucket name */
  bucket: string;

  /** AWS region (e.g., 'us-east-1') */
  region: string;

  /** Optional S3 object key/prefix for uploaded files */
  prefix?: string;

  /** Optional metadata to attach to S3 objects */
  metadata?: Record<string, string>;

  /** Optional ACL for S3 objects (default: 'private') */
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';

  /** Optional content type override */
  contentType?: string;

  /** Optional server-side encryption (e.g., 'AES256', 'aws:kms') */
  serverSideEncryption?: string;

  /** Optional KMS key ID for encryption */
  sseKmsKeyId?: string;

  /** Optional storage class (e.g., 'STANDARD', 'GLACIER') */
  storageClass?: string;

  /** Optional tag set for S3 objects */
  tagging?: Record<string, string>;
}

/**
 * Azure Blob Storage upload configuration options
 * @interface AzureBlobUploadConfig
 */
export interface AzureBlobUploadConfig {
  /** Azure connection string or account name */
  accountName: string;

  /** Container name */
  container: string;

  /** Optional blob path/prefix */
  prefix?: string;

  /** Optional metadata to attach to blob */
  metadata?: Record<string, string>;

  /** Optional blob tier ('Hot', 'Cool', 'Archive') */
  tier?: 'Hot' | 'Cool' | 'Archive';

  /** Optional content type override */
  contentType?: string;

  /** Optional blob encryption scope */
  encryptionScope?: string;
}

/**
 * Response from successful local storage upload
 * @interface LocalStorageUploadResponse
 */
export interface LocalStorageUploadResponse {
  /** Local file path */
  path: string;

  /** Absolute file path */
  absolutePath: string;

  /** File size in bytes */
  size: number;

  /** MIME type */
  mimeType: string;

  /** Original filename */
  filename: string;

  /** File extension */
  extension: string;

  /** File permissions */
  permissions: number;

  /** File creation/write timestamp */
  createdAt: Date;
}

/**
 * Response from successful S3 upload
 * @interface S3UploadResponse
 */
export interface S3UploadResponse {
  /** S3 object key (path) */
  key: string;

  /** S3 bucket name */
  bucket: string;

  /** AWS region */
  region: string;

  /** File size in bytes */
  size: number;

  /** MIME type */
  mimeType: string;

  /** Original filename */
  filename: string;

  /** S3 object version ID (if versioning enabled) */
  versionId?: string;

  /** Full S3 URL (https://bucket.s3.region.amazonaws.com/key) */
  url: string;

  /** ETag (file hash) */
  etag: string;

  /** Server-side encryption method used */
  serverSideEncryption?: string;
}

/**
 * Response from successful Azure Blob upload
 * @interface AzureBlobUploadResponse
 */
export interface AzureBlobUploadResponse {
  /** Blob name/path */
  name: string;

  /** Container name */
  container: string;

  /** Account name */
  accountName: string;

  /** File size in bytes */
  size: number;

  /** MIME type */
  mimeType: string;

  /** Original filename */
  filename: string;

  /** Blob URI */
  uri: string;

  /** ETag (unique identifier) */
  etag: string;

  /** Last modified timestamp */
  lastModified: Date;

  /** Server-side encryption info */
  encryptionScope?: string;

  /** Blob tier */
  tier?: string;
}

/**
 * Storage upload response (union type for Local, S3, or Azure)
 * @type StorageUploadResponse
 */
export type StorageUploadResponse =
  LocalStorageUploadResponse | S3UploadResponse | AzureBlobUploadResponse;

/**
 * Error response from storage upload
 * @interface StorageUploadError
 */
export interface StorageUploadError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** HTTP status code */
  statusCode: number;

  /** Original file name that failed */
  filename?: string;

  /** Additional error details */
  details?: Record<string, unknown>;
}
