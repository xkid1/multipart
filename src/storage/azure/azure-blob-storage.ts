import {
  deleteFromAzureBlob,
  existsInAzureBlob,
  uploadMultipleToAzureBlob,
  uploadToAzureBlob,
} from './azure-uploader.js';

import type {
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
  StorageAdapter,
} from '../../types/index.js';

/**
 * Azure Blob Storage {@link StorageAdapter}.
 *
 * @example
 * ```typescript
 * const storage = new AzureBlobStorage(containerClient, {
 *   accountName: 'myaccount',
 *   container: 'uploads',
 * });
 * const { name } = await storage.upload(req.files.avatar);
 * ```
 */
export class AzureBlobStorage implements StorageAdapter<AzureBlobUploadResponse> {
  constructor(
    readonly containerClient: AzureBlobContainerClientInterface,
    readonly config: AzureBlobUploadConfig,
  ) {}

  upload(file: FileData): Promise<AzureBlobUploadResponse> {
    return uploadToAzureBlob(file, this.containerClient, this.config);
  }

  uploadMany(files: FileData[]): Promise<AzureBlobUploadResponse[]> {
    return uploadMultipleToAzureBlob(files, this.containerClient, this.config);
  }

  delete(key: string): Promise<void> {
    return deleteFromAzureBlob(key, this.containerClient);
  }

  exists(key: string): Promise<boolean> {
    return existsInAzureBlob(key, this.containerClient);
  }
}
