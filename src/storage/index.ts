/**
 * Storage integrations for parsed multipart files: local filesystem, AWS S3 and
 * Azure Blob Storage. Each cloud provider needs its SDK installed separately.
 *
 * Prefer the provider subpaths (`@xkid1/multipart/storage/s3`, ...) so your
 * application only loads the SDKs it uses.
 *
 * Exports are listed explicitly: the provider modules share type names
 * (`FileData`, `StorageAdapter`, ...), which `export *` would make ambiguous.
 *
 * @module @xkid1/multipart/storage
 */

export {
  AzureBlobStorage,
  deleteFromAzureBlob,
  existsInAzureBlob,
  getAzureBlobSasUrl,
  uploadMultipleToAzureBlob,
  uploadToAzureBlob,
} from './azure/index.js';
export {
  deleteFromLocal,
  existsInLocal,
  getLocalFileUrl,
  LocalStorage,
  uploadMultipleToLocal,
  uploadToLocal,
} from './local/index.js';
export {
  deleteFromS3,
  existsInS3,
  getS3PresignedUrl,
  S3Storage,
  uploadMultipleToS3,
  uploadToS3,
} from './s3/index.js';
export {
  buildContentDisposition,
  createUniqueName,
  isStorageError,
  sanitizeFilename,
  type StorageError,
} from './shared/index.js';
export type {
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
  StorageAdapter,
  StorageUploadError,
} from '../types/index.js';
