/**
 * Local storage module exports
 * @module @xkid1/multipart/storage/local
 */

export { LocalStorage } from './local-storage';
export {
  deleteFromLocal,
  existsInLocal,
  getLocalFileUrl,
  uploadMultipleToLocal,
  uploadToLocal,
} from './local-uploader';

export type {
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  StorageAdapter,
  StorageUploadError,
} from '@types';
export type { StorageError } from '../shared';
