/**
 * Azure Blob Storage module
 * @module @xkid1/multipart/storage/azure
 */

export { AzureBlobStorage } from './azure-blob-storage';
export {
  deleteFromAzureBlob,
  existsInAzureBlob,
  getAzureBlobSasUrl,
  uploadMultipleToAzureBlob,
  uploadToAzureBlob,
} from './azure-uploader';

export type {
  AzureBlobClientInterface,
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
  StorageAdapter,
  StorageUploadError,
} from '@types';
export type { StorageError } from '../shared';
