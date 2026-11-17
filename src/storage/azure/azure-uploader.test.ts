import { describe, expect, it, vi } from 'vitest';

import {
  deleteFromAzureBlob,
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
      upload: vi.fn().mockResolvedValue({}),
      getProperties: vi.fn().mockResolvedValue({
        etag: '"az-etag"',
        lastModified: new Date('2026-01-01'),
        accessTier: 'Hot',
        encryptionScope: 'default-scope',
      }),
      delete: vi.fn().mockResolvedValue({}),
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
      expect(result.tier).toBe('Hot');
      expect(result.uri).toContain('https://mystorageaccount.blob.core.windows.net');
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
        getProperties: vi.fn(),
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
        getProperties: vi.fn(),
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

  describe('getAzureBlobSasUrl', () => {
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
