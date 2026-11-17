import { describe, expect, it, vi } from 'vitest';

import {
  deleteFromS3,
  getS3PresignedUrl,
  uploadMultipleToS3,
  uploadToS3,
} from './s3-uploader.js';

import type { FileData, S3ClientInterface, S3UploadConfig } from '../../types/index.js';

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: class {
    constructor(public input: any) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: any) {}
  },
  GetObjectCommand: class {
    constructor(public input: any) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue(
      'https://test-bucket.s3.us-east-1.amazonaws.com/uploads/photo.jpg?signed=true',
    ),
}));

describe('s3-uploader', () => {
  const createMockFile = (name = 'photo.jpg'): FileData => ({
    name,
    mimeType: 'image/jpeg',
    size: 1024,
    encoding: 'binary',
    extension: 'jpg',
    buffer: Buffer.from('fake-image-bytes'),
  });

  const baseConfig: S3UploadConfig = {
    bucket: 'test-bucket',
    region: 'us-east-1',
    prefix: 'uploads/',
  };

  describe('uploadToS3', () => {
    it('should successfully upload file to S3', async () => {
      const mockSend = vi.fn().mockResolvedValue({
        ETag: '"etag-123"',
        VersionId: 'v-1',
        ServerSideEncryption: 'AES256',
      });
      const s3Client: S3ClientInterface = { send: mockSend };

      const file = createMockFile();
      const result = await uploadToS3(file, s3Client, {
        ...baseConfig,
        acl: 'public-read',
        storageClass: 'STANDARD',
        tagging: { env: 'test' },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.bucket).toBe('test-bucket');
      expect(result.region).toBe('us-east-1');
      expect(result.etag).toBe('"etag-123"');
      expect(result.versionId).toBe('v-1');
      expect(result.serverSideEncryption).toBe('AES256');
      expect(result.url).toContain('https://test-bucket.s3.us-east-1.amazonaws.com/');
    });

    it('should validate required parameters', async () => {
      const s3Client: S3ClientInterface = { send: vi.fn() };
      const file = createMockFile();

      await expect(uploadToS3(null as any, s3Client, baseConfig)).rejects.toThrow(
        'Invalid file data: missing buffer',
      );

      await expect(
        uploadToS3(file, s3Client, { ...baseConfig, bucket: '' }),
      ).rejects.toThrow('S3 bucket name is required');

      await expect(
        uploadToS3(file, s3Client, { ...baseConfig, region: '' }),
      ).rejects.toThrow('AWS region is required');
    });

    it('should format and wrap S3 errors properly', async () => {
      const s3Error: any = new Error('Access Denied');
      s3Error.name = 'AccessDenied';
      s3Error.$metadata = { httpStatusCode: 403 };

      const s3Client: S3ClientInterface = {
        send: vi.fn().mockRejectedValue(s3Error),
      };

      await expect(
        uploadToS3(createMockFile(), s3Client, baseConfig),
      ).rejects.toMatchObject({
        code: 'AccessDenied',
        statusCode: 403,
        message: 'Access Denied',
      });
    });
  });

  describe('uploadMultipleToS3', () => {
    it('should upload all files in list', async () => {
      const s3Client: S3ClientInterface = {
        send: vi.fn().mockResolvedValue({ ETag: '"ok"' }),
      };

      const files = [createMockFile('a.png'), createMockFile('b.png')];
      const results = await uploadMultipleToS3(files, s3Client, baseConfig);

      expect(results).toHaveLength(2);
      expect(s3Client.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteFromS3', () => {
    it('should call DeleteObjectCommand', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      const s3Client: S3ClientInterface = { send: mockSend };

      await deleteFromS3('uploads/test.jpg', s3Client, 'test-bucket');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should wrap deletion errors', async () => {
      const s3Client: S3ClientInterface = {
        send: vi.fn().mockRejectedValue(new Error('Delete failed')),
      };

      await expect(
        deleteFromS3('uploads/test.jpg', s3Client, 'test-bucket'),
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('getS3PresignedUrl', () => {
    it('should generate presigned url using presigner', async () => {
      const s3Client: S3ClientInterface = { send: vi.fn() };

      const url = await getS3PresignedUrl(
        'uploads/photo.jpg',
        s3Client,
        'test-bucket',
        3600,
      );

      expect(typeof url).toBe('string');
    });

    it('should handle presigner errors', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      vi.mocked(getSignedUrl).mockRejectedValueOnce(new Error('Cannot sign URL'));

      const s3Client: S3ClientInterface = { send: vi.fn() };
      await expect(
        getS3PresignedUrl('uploads/photo.jpg', s3Client, 'test-bucket'),
      ).rejects.toThrow('Cannot sign URL');
    });

    it('should handle missing presigner dependency error', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const err: any = new Error('Cannot find module @aws-sdk/s3-request-presigner');
      err.code = 'ERR_MODULE_NOT_FOUND';
      vi.mocked(getSignedUrl).mockRejectedValueOnce(err);

      const s3Client: S3ClientInterface = { send: vi.fn() };
      await expect(
        getS3PresignedUrl('uploads/photo.jpg', s3Client, 'test-bucket'),
      ).rejects.toThrow('Package @aws-sdk/s3-request-presigner is required');
    });
  });
});
