/**
 * Azure Blob Storage module
 * @module @xkid1/multipart/storage/azure
 */

export { AzureBlobStorage } from './azure-blob-storage.js';
export {
  deleteFromAzureBlob,
  existsInAzureBlob,
  getAzureBlobSasUrl,
  uploadMultipleToAzureBlob,
  uploadToAzureBlob,
} from './azure-uploader.js';

export type {
  AzureBlobClientInterface,
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
  StorageAdapter,
  StorageUploadError,
} from '../../types/index.js';
export type { StorageError } from '../shared/index.js';
