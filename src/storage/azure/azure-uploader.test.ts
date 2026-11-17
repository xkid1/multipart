import { describe, expect, it, vi } from 'vitest';

import { AzureBlobStorage } from './azure-blob-storage';
import {
  deleteFromAzureBlob,
  existsInAzureBlob,
  getAzureBlobSasUrl,
  uploadMultipleToAzureBlob,
  uploadToAzureBlob,
} from './azure-uploader';

import type {
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  FileData,
} from '@types';

vi.mock('@azure/storage-blob', () => ({
  BlobSASPermissions: {
    parse: vi.fn().mockReturnValue({ toString: () => 'racwd' }),
  },
  generateBlobSASQueryParameters: vi.fn().mockReturnValue({
    toString: () => 'sig=mock-sas-token',
  }),
  StorageSharedKeyCredential: class {
    constructor(
      public accountName: string,
      public accountKey: string,
    ) {}
  },
}));

describe('azure-uploader', () => {
  const createMockFile = (name = 'doc.pdf'): FileData => ({
    name,
    mimeType: 'application/pdf',
    size: 2048,
    encoding: 'binary',
    extension: 'pdf',
    buffer: Buffer.from('mock-pdf-bytes'),
  });

  const baseConfig: AzureBlobUploadConfig = {
    accountName: 'mystorageaccount',
    container: 'documents',
    prefix: 'uploads/',
  };

  const createMockContainerClient = (
    overrides: Partial<AzureBlobContainerClientInterface> = {},
  ): AzureBlobContainerClientInterface => {
    const mockBlobClient = {
      url: 'https://mystorageaccount.blob.core.windows.net/documents/uploads/doc.pdf',
      upload: vi.fn().mockResolvedValue({
        etag: '"az-etag"',
        lastModified: new Date('2026-01-01'),
        encryptionScope: 'default-scope',
      }),
      delete: vi.fn().mockResolvedValue({}),
      exists: vi.fn().mockResolvedValue(true),
    };

    return {
      containerName: 'documents',
      accountName: 'mystorageaccount',
      getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      ...overrides,
    };
  };

  describe('uploadToAzureBlob', () => {
    it('should successfully upload file to Azure blob', async () => {
      const containerClient = createMockContainerClient();
      const file = createMockFile();

      const result = await uploadToAzureBlob(file, containerClient, {
        ...baseConfig,
        tier: 'Hot',
        encryptionScope: 'scope1',
      });

      expect(containerClient.getBlockBlobClient).toHaveBeenCalled();
      expect(result.accountName).toBe('mystorageaccount');
      expect(result.container).toBe('documents');
      expect(result.etag).toBe('"az-etag"');
      expect(result.lastModified).toEqual(new Date('2026-01-01'));
      expect(result.encryptionScope).toBe('default-scope');
      expect(result.tier).toBe('Hot');
      expect(result.uri).toContain('https://mystorageaccount.blob.core.windows.net');
    });

    it('should pass content type, content disposition, tier and metadata to the SDK', async () => {
      const containerClient = createMockContainerClient();
      await uploadToAzureBlob(createMockFile('résumé.pdf'), containerClient, {
        ...baseConfig,
        tier: 'Cool',
        metadata: { owner: 'u1' },
      });

      const blobClient = vi.mocked(containerClient.getBlockBlobClient).mock.results[0]
        .value;
      const [data, length, options] = blobClient.upload.mock.calls[0];
      expect(Buffer.isBuffer(data)).toBe(true);
      expect(length).toBe(data.byteLength);
      expect(options).toMatchObject({
        blobHTTPHeaders: {
          blobContentType: 'application/pdf',
          blobContentDisposition: `inline; filename="r_sum_.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf`,
        },
        metadata: { owner: 'u1' },
        tier: 'Cool',
      });
    });

    it('should omit content disposition when configured with false', async () => {
      const containerClient = createMockContainerClient();
      await uploadToAzureBlob(createMockFile(), containerClient, {
        ...baseConfig,
        contentDisposition: false,
      });

      const blobClient = vi.mocked(containerClient.getBlockBlobClient).mock.results[0]
        .value;
      expect(blobClient.upload.mock.calls[0][2].blobHTTPHeaders).not.toHaveProperty(
        'blobContentDisposition',
      );
    });

    it('should give same-named files distinct blob names', async () => {
      const containerClient = createMockContainerClient();
      const [a, b] = await uploadMultipleToAzureBlob(
        [createMockFile('same.pdf'), createMockFile('same.pdf')],
        containerClient,
        baseConfig,
      );
      expect(a.name).not.toBe(b.name);
      expect(a.name).toMatch(/^uploads\/\d+-[0-9a-f]{8}-same\.pdf$/);
    });

    it('should strip directory parts from client filenames', async () => {
      const result = await uploadToAzureBlob(
        createMockFile('..\\..\\evil.pdf'),
        createMockContainerClient(),
        baseConfig,
      );
      expect(result.name).toMatch(/^uploads\/\d+-[0-9a-f]{8}-evil\.pdf$/);
    });

    it('should validate required options', async () => {
      const containerClient = createMockContainerClient();
      const file = createMockFile();

      await expect(
        uploadToAzureBlob(null as any, containerClient, baseConfig),
      ).rejects.toThrow('Invalid file data: missing buffer');

      await expect(
        uploadToAzureBlob(file, containerClient, { ...baseConfig, container: '' }),
      ).rejects.toThrow('Azure container name is required');

      await expect(
        uploadToAzureBlob(file, containerClient, { ...baseConfig, accountName: '' }),
      ).rejects.toThrow('Azure account name is required');
    });

    it('should wrap Azure SDK errors', async () => {
      const mockBlobClient = {
        url: 'https://test',
        upload: vi.fn().mockRejectedValue({
          statusCode: 404,
          code: 'ContainerNotFound',
          message: 'Container not found',
        }),
        exists: vi.fn(),
        delete: vi.fn(),
      };
      const containerClient: AzureBlobContainerClientInterface = {
        containerName: 'documents',
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      };

      await expect(
        uploadToAzureBlob(createMockFile(), containerClient, baseConfig),
      ).rejects.toMatchObject({
        code: 'ContainerNotFound',
        statusCode: 404,
      });
    });
  });

  describe('uploadMultipleToAzureBlob', () => {
    it('should upload all files in list', async () => {
      const containerClient = createMockContainerClient();
      const files = [createMockFile('1.pdf'), createMockFile('2.pdf')];

      const results = await uploadMultipleToAzureBlob(files, containerClient, baseConfig);
      expect(results).toHaveLength(2);
    });
  });

  describe('deleteFromAzureBlob', () => {
    it('should delete specified blob', async () => {
      const containerClient = createMockContainerClient();
      await deleteFromAzureBlob('uploads/doc.pdf', containerClient);
      const blobClient = containerClient.getBlockBlobClient('uploads/doc.pdf');
      expect(blobClient.delete).toHaveBeenCalled();
    });

    it('should wrap delete errors', async () => {
      const mockBlobClient = {
        url: 'https://test',
        upload: vi.fn(),
        exists: vi.fn(),
        delete: vi.fn().mockRejectedValue(new Error('Azure delete failed')),
      };
      const containerClient: AzureBlobContainerClientInterface = {
        containerName: 'documents',
        getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
      };

      await expect(
        deleteFromAzureBlob('uploads/doc.pdf', containerClient),
      ).rejects.toThrow('Azure delete failed');
    });
  });

  describe('existsInAzureBlob', () => {
    it('should return the SDK exists() result', async () => {
      expect(await existsInAzureBlob('a.pdf', createMockContainerClient())).toBe(true);
    });

    it('should wrap exists errors', async () => {
      const containerClient: AzureBlobContainerClientInterface = {
        containerName: 'documents',
        getBlockBlobClient: vi.fn().mockReturnValue({
          exists: vi
            .fn()
            .mockRejectedValue({ statusCode: 403, code: 'AuthorizationFailure' }),
        }),
      };
      await expect(existsInAzureBlob('a.pdf', containerClient)).rejects.toMatchObject({
        code: 'AuthorizationFailure',
        statusCode: 403,
      });
    });
  });

  describe('AzureBlobStorage adapter', () => {
    it('should delegate upload, uploadMany, delete and exists', async () => {
      const containerClient = createMockContainerClient();
      const storage = new AzureBlobStorage(containerClient, baseConfig);

      expect((await storage.upload(createMockFile())).container).toBe('documents');
      expect(await storage.uploadMany([createMockFile(), createMockFile()])).toHaveLength(
        2,
      );
      await storage.delete('uploads/doc.pdf');
      expect(await storage.exists('uploads/doc.pdf')).toBe(true);
    });
  });

  describe('getAzureBlobSasUrl', () => {
    it('should default to read-only permissions', async () => {
      const { BlobSASPermissions } = await import('@azure/storage-blob');
      getAzureBlobSasUrl('uploads/doc.pdf', createMockContainerClient(), 'a2V5');
      expect(BlobSASPermissions.parse).toHaveBeenLastCalledWith('r');

      getAzureBlobSasUrl(
        'uploads/doc.pdf',
        createMockContainerClient(),
        'a2V5',
        undefined,
        'rw',
      );
      expect(BlobSASPermissions.parse).toHaveBeenLastCalledWith('rw');
    });

    it('should reject a container client without accountName', () => {
      const containerClient = createMockContainerClient({ accountName: undefined });
      expect(() => getAzureBlobSasUrl('a.pdf', containerClient, 'a2V5')).toThrow(
        'no accountName',
      );
    });

    it('should generate SAS query URL with account key', () => {
      const containerClient = createMockContainerClient();
      const sasUrl = getAzureBlobSasUrl(
        'uploads/doc.pdf',
        containerClient,
        'bW9ja0FjY291bnRLZXk=',
      );

      expect(typeof sasUrl).toBe('string');
      expect(sasUrl).toContain('https://mystorageaccount.blob.core.windows.net');
    });

    it('should wrap SAS generation errors', async () => {
      const { generateBlobSASQueryParameters } = await import('@azure/storage-blob');
      vi.mocked(generateBlobSASQueryParameters).mockImplementationOnce(() => {
        throw new Error('SAS signing failed');
      });

      const containerClient = createMockContainerClient();
      expect(() =>
        getAzureBlobSasUrl('uploads/doc.pdf', containerClient, 'bad-key'),
      ).toThrow('SAS signing failed');
    });
  });
});
