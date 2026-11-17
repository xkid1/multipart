import { describe, expect, it, vi } from 'vitest';

import * as root from '../src/index.js';
import * as libs from '../src/libs/index.js';
import * as middleware from '../src/middleware/index.js';
import * as storageAzure from '../src/storage/azure/index.js';
import * as storage from '../src/storage/index.js';
import * as storageLocal from '../src/storage/local/index.js';
import * as storageS3 from '../src/storage/s3/index.js';
import * as utils from '../src/utils/index.js';

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@azure/storage-blob', () => ({
  BlobSASPermissions: { parse: vi.fn() },
  generateBlobSASQueryParameters: vi.fn().mockReturnValue({ toString: () => '' }),
  StorageSharedKeyCredential: vi.fn(),
}));

describe('package exports and barrels', () => {
  it('should export root functions and utilities', () => {
    expect(typeof root.multipart).toBe('function');
    expect(typeof root.multipartExpress).toBe('function');
    expect(typeof root.parseMultipartWithDuplicates).toBe('function');
    expect(typeof root.uploadToLocal).toBe('function');
    expect(typeof root.uploadMultipleToLocal).toBe('function');
    expect(typeof root.deleteFromLocal).toBe('function');
    expect(typeof root.getLocalFileUrl).toBe('function');
    expect(typeof root.encoding).toBe('function');
    expect(typeof root.MultiPartError).toBe('function');
  });

  it('should export storage modules', () => {
    expect(typeof storage.uploadToLocal).toBe('function');
    expect(typeof storage.uploadToS3).toBe('function');
    expect(typeof storage.uploadToAzureBlob).toBe('function');

    expect(typeof storageLocal.uploadToLocal).toBe('function');
    expect(typeof storageS3.uploadToS3).toBe('function');
    expect(typeof storageAzure.uploadToAzureBlob).toBe('function');
  });

  it('should export middleware modules', () => {
    expect(typeof middleware.multipartExpress).toBe('function');
    expect(typeof middleware.parseMultipartWithDuplicates).toBe('function');
  });

  it('should export the new public API from the root entry', () => {
    for (const name of [
      'LocalStorage',
      'existsInLocal',
      'extractBoundary',
      'isMultipartFormData',
      'splitFormData',
      'iterateParts',
      'multipartErrorHandler',
      'parseMultipartRequest',
      'isStorageError',
      'sanitizeFilename',
    ] as const) {
      expect(typeof root[name]).toBe('function');
    }
    expect(root.MultiPartErrorCode.LIMIT_FILES).toBe('LIMIT_FILES');
    expect(root.DEFAULT_LIMITS.maxSize).toBe(100 * 1024 * 1024);
  });

  it('should export storage adapters from their subpaths', () => {
    expect(typeof storageLocal.LocalStorage).toBe('function');
    expect(typeof storageS3.S3Storage).toBe('function');
    expect(typeof storageS3.existsInS3).toBe('function');
    expect(typeof storageAzure.AzureBlobStorage).toBe('function');
    expect(typeof storageAzure.existsInAzureBlob).toBe('function');
  });

  it('should keep NestJS (a runtime dependency) out of the root entry', () => {
    expect(root).not.toHaveProperty('MultipartNestjs');
  });

  it('should export libs and utils', () => {
    expect(typeof libs.default).toBe('function');
    expect(typeof utils.encoding).toBe('function');
    expect(typeof utils.extractFilename).toBe('function');
  });
});
