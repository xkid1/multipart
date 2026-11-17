import { describe, expect, it, vi } from 'vitest';

import { S3Storage } from './s3-storage.js';
import { existsInS3, uploadMultipleToS3, uploadToS3 } from './s3-uploader.js';

import type { FileData, S3ClientInterface, S3UploadConfig } from '../../types/index.js';

vi.mock('@aws-sdk/client-s3', () => {
  const command = (type: string) =>
    class {
      readonly type = type;
      constructor(public input: any) {}
    };
  return {
    PutObjectCommand: command('Put'),
    DeleteObjectCommand: command('Delete'),
    GetObjectCommand: command('Get'),
    HeadObjectCommand: command('Head'),
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed.example'),
}));

const file = (name: string): FileData => ({
  name,
  mimeType: 'application/pdf',
  size: 4,
  encoding: 'binary',
  extension: '.pdf',
  buffer: Buffer.from('%PDF'),
});

const config: S3UploadConfig = { bucket: 'bucket', region: 'eu-west-1', prefix: 'up/' };

const client = (send = vi.fn().mockResolvedValue({ ETag: '"e"' })) =>
  ({ send }) satisfies S3ClientInterface;

describe('s3 storage', () => {
  it('sends content type, length and an RFC 5987 content disposition', async () => {
    const s3 = client();
    await uploadToS3(file('résumé.pdf'), s3, {
      ...config,
      serverSideEncryption: 'aws:kms',
    });

    expect(s3.send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'bucket',
      ContentType: 'application/pdf',
      ContentLength: 4,
      ContentDisposition: `inline; filename="r_sum_.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf`,
      ServerSideEncryption: 'aws:kms',
    });
  });

  it('uses a custom content disposition, or omits it with false', async () => {
    const s3 = client();
    await uploadToS3(file('a.pdf'), s3, { ...config, contentDisposition: 'attachment' });
    await uploadToS3(file('a.pdf'), s3, { ...config, contentDisposition: false });

    expect(s3.send.mock.calls[0][0].input.ContentDisposition).toBe('attachment');
    expect(s3.send.mock.calls[1][0].input).not.toHaveProperty('ContentDisposition');
  });

  it('gives same-named files distinct keys and URL-encodes the object URL', async () => {
    const [a, b] = await uploadMultipleToS3(
      [file('my file.pdf'), file('my file.pdf')],
      client(),
      config,
    );

    expect(a.key).not.toBe(b.key);
    expect(a.key).toMatch(/^up\/\d+-[0-9a-f]{8}-my file\.pdf$/);
    expect(a.url).toBe(
      `https://bucket.s3.eu-west-1.amazonaws.com/${a.key.split('/').map(encodeURIComponent).join('/')}`,
    );
    expect(a.url).not.toContain(' ');
  });

  it('reports validation errors with a 400 status', async () => {
    await expect(
      uploadToS3(file('a.pdf'), client(), { ...config, bucket: '' }),
    ).rejects.toMatchObject({
      code: 'S3_VALIDATION_ERROR',
      statusCode: 400,
      filename: 'a.pdf',
    });
  });

  describe('existsInS3', () => {
    it('returns true when HeadObject succeeds', async () => {
      const s3 = client(vi.fn().mockResolvedValue({}));
      expect(await existsInS3('k', s3, 'bucket')).toBe(true);
      expect(s3.send.mock.calls[0][0]).toMatchObject({
        type: 'Head',
        input: { Key: 'k' },
      });
    });

    it('returns false for 404 / NotFound', async () => {
      const notFound = { name: 'NotFound', $metadata: { httpStatusCode: 404 } };
      expect(
        await existsInS3('k', client(vi.fn().mockRejectedValue(notFound)), 'b'),
      ).toBe(false);
    });

    it('rethrows other errors as storage errors', async () => {
      const denied = {
        name: 'Forbidden',
        $metadata: { httpStatusCode: 403 },
        message: 'denied',
      };
      await expect(
        existsInS3('k', client(vi.fn().mockRejectedValue(denied)), 'b'),
      ).rejects.toMatchObject({ code: 'Forbidden', statusCode: 403, message: 'denied' });
    });
  });

  it('S3Storage implements the StorageAdapter contract', async () => {
    const s3 = client();
    const storage = new S3Storage(s3, config);

    const { key } = await storage.upload(file('a.pdf'));
    expect(await storage.uploadMany([file('b.pdf')])).toHaveLength(1);
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(true);
    expect(await storage.getUrl(key, 60)).toBe('https://signed.example');

    expect(
      s3.send.mock.calls.map(([command]) => (command as { type: string }).type),
    ).toEqual(['Put', 'Put', 'Delete', 'Head']);
  });
});
