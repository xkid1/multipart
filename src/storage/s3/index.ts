/**
 * AWS S3 storage module
 * @module @xkid1/multipart/storage/s3
 */

export { S3Storage } from './s3-storage.js';
export {
  deleteFromS3,
  existsInS3,
  getS3PresignedUrl,
  uploadMultipleToS3,
  uploadToS3,
} from './s3-uploader.js';

export type {
  FileData,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
  StorageAdapter,
  StorageUploadError,
} from '../../types/index.js';
export type { StorageError } from '../shared/index.js';
