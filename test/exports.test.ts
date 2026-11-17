import { describe, expect, it, vi } from 'vitest';

import * as root from '../src/index';
import * as libs from '../src/libs/index';
import * as middleware from '../src/middleware/index';
import * as storageAzure from '../src/storage/azure/index';
import * as storage from '../src/storage/index';
import * as storageLocal from '../src/storage/local/index';
import * as storageS3 from '../src/storage/s3/index';
import * as utils from '../src/utils/index';

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

  it('should export libs and utils', () => {
    expect(typeof libs.default).toBe('function');
    expect(typeof utils.encoding).toBe('function');
    expect(typeof utils.extractFilename).toBe('function');
  });
});
