/**
 * Common interface implemented by every storage provider.
 * @module @xkid1/multipart/types/storage
 */

import type { FileData } from '../file-data/file-data';

/**
 * A storage backend for parsed uploads. `LocalStorage`, `S3Storage` and
 * `AzureBlobStorage` all implement it, so application code can switch providers
 * without changes.
 *
 * @typeParam TUploadResponse - Provider-specific upload result
 */
export interface StorageAdapter<TUploadResponse> {
  /** Store one file. */
  upload(file: FileData): Promise<TUploadResponse>;
  /** Store files one after another; rejects on the first failure. */
  uploadMany(files: FileData[]): Promise<TUploadResponse[]>;
  /** Delete a stored file by the key/path returned from {@link upload}. */
  delete(key: string): Promise<void>;
  /** Whether a stored file exists. */
  exists(key: string): Promise<boolean>;
}
