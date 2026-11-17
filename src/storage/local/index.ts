/**
 * Local storage module exports
 * @module @xkid1/multipart/storage/local
 */

export { LocalStorage } from './local-storage.js';
export {
  deleteFromLocal,
  existsInLocal,
  getLocalFileUrl,
  uploadMultipleToLocal,
  uploadToLocal,
} from './local-uploader.js';

export type {
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  StorageAdapter,
  StorageUploadError,
} from '../../types/index.js';
export type { StorageError } from '../shared/index.js';
