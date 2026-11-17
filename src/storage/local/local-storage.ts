import {
  deleteFromLocal,
  existsInLocal,
  getLocalFileUrl,
  uploadToLocal,
} from './local-uploader';

import type {
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  StorageAdapter,
} from '@types';

/**
 * Local filesystem {@link StorageAdapter}.
 *
 * @example
 * ```typescript
 * const storage = new LocalStorage({ directory: './uploads' });
 * const saved = await storage.upload(req.files.avatar);
 * await storage.delete(saved.path);
 * ```
 */
export class LocalStorage implements StorageAdapter<LocalStorageUploadResponse> {
  constructor(readonly config: LocalStorageConfig) {}

  upload(file: FileData): Promise<LocalStorageUploadResponse> {
    return uploadToLocal(file, this.config);
  }

  async uploadMany(files: FileData[]): Promise<LocalStorageUploadResponse[]> {
    const results: LocalStorageUploadResponse[] = [];
    for (const file of files) results.push(await this.upload(file));
    return results;
  }

  async delete(key: string): Promise<void> {
    await deleteFromLocal(key, this.config.directory);
  }

  exists(key: string): Promise<boolean> {
    return existsInLocal(key, this.config.directory);
  }

  /** Public URL for a stored file, given the base URL the directory is served from. */
  getUrl(key: string, baseUrl: string): string {
    return getLocalFileUrl(key, baseUrl);
  }
}
