import {
  deleteFromS3,
  existsInS3,
  getS3PresignedUrl,
  uploadMultipleToS3,
  uploadToS3,
} from './s3-uploader';

import type {
  FileData,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
  StorageAdapter,
} from '@types';

/**
 * AWS S3 {@link StorageAdapter}.
 *
 * @example
 * ```typescript
 * const storage = new S3Storage(new S3Client({ region: 'eu-west-1' }), {
 *   bucket: 'uploads',
 *   region: 'eu-west-1',
 * });
 * const { key } = await storage.upload(req.files.avatar);
 * ```
 */
export class S3Storage implements StorageAdapter<S3UploadResponse> {
  constructor(
    readonly client: S3ClientInterface,
    readonly config: S3UploadConfig,
  ) {}

  upload(file: FileData): Promise<S3UploadResponse> {
    return uploadToS3(file, this.client, this.config);
  }

  uploadMany(files: FileData[]): Promise<S3UploadResponse[]> {
    return uploadMultipleToS3(files, this.client, this.config);
  }

  delete(key: string): Promise<void> {
    return deleteFromS3(key, this.client, this.config.bucket);
  }

  exists(key: string): Promise<boolean> {
    return existsInS3(key, this.client, this.config.bucket);
  }

  /** Pre-signed GET URL; requires `@aws-sdk/s3-request-presigner`. */
  getUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return getS3PresignedUrl(key, this.client, this.config.bucket, expiresInSeconds);
  }
}
