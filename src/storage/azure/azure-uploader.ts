/**
 * Azure Blob Storage for parsed multipart files.
 *
 * Requires the Azure Storage SDK:
 * ```bash
 * npm install @azure/storage-blob
 * ```
 *
 * @module @xkid1/multipart/storage/azure
 */

import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

import {
  createStorageError,
  createUniqueName,
  errorMessage,
  isStorageError,
  resolveContentDisposition,
  stringProp,
} from '../shared/index.js';

import type {
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
} from '../../types/index.js';

/** Map an Azure SDK `RestError` (or anything else) to a {@link StorageError}. */
const azureError = (error: unknown, filename?: string): Error => {
  if (isStorageError(error)) return error;

  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  const message = errorMessage(error, 'Unknown Azure Blob Storage error');

  return createStorageError(
    {
      code: stringProp(error, 'code') ?? 'AZURE_BLOB_ERROR',
      message,
      statusCode: typeof status === 'number' ? status : 500,
      filename,
      details: {
        azureCode: (error as { code?: unknown } | null)?.code,
        azureMessage: error instanceof Error ? error.message : undefined,
        azureDetails: (error as { details?: unknown } | null)?.details,
      },
    },
    error,
  );
};

const validationError = (message: string, filename?: string): Error =>
  createStorageError({
    code: 'AZURE_VALIDATION_ERROR',
    message,
    statusCode: 400,
    filename,
  });

/**
 * Upload a single file as a block blob named `<prefix><timestamp>-<random>-<filename>`.
 *
 * @throws {StorageError} If validation or the upload fails
 *
 * @example
 * ```typescript
 * import { BlobServiceClient } from '@azure/storage-blob';
 * import { uploadToAzureBlob } from '@xkid1/multipart/storage/azure';
 *
 * const container = BlobServiceClient
 *   .fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!)
 *   .getContainerClient('uploads');
 *
 * const result = await uploadToAzureBlob(req.files.avatar, container, {
 *   accountName: 'myaccount',
 *   container: 'uploads',
 *   prefix: 'user-uploads/',
 * });
 * ```
 */
export async function uploadToAzureBlob(
  file: FileData,
  containerClient: AzureBlobContainerClientInterface,
  config: AzureBlobUploadConfig,
): Promise<AzureBlobUploadResponse> {
  if (!Buffer.isBuffer(file?.buffer))
    throw validationError('Invalid file data: missing buffer');
  if (!config?.container)
    throw validationError('Azure container name is required', file.name);
  if (!config.accountName)
    throw validationError('Azure account name is required', file.name);

  const blobName = createUniqueName(file.name, config.prefix);
  const mimeType = config.contentType ?? (file.mimeType || 'application/octet-stream');
  const contentDisposition = resolveContentDisposition(
    file.name,
    config.contentDisposition,
  );

  try {
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const result = await blobClient.upload(file.buffer, file.buffer.byteLength, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
        ...(contentDisposition && { blobContentDisposition: contentDisposition }),
      },
      metadata: config.metadata ?? {},
      ...(config.tier && { tier: config.tier }),
      ...(config.encryptionScope && { encryptionScope: config.encryptionScope }),
    });

    return {
      name: blobName,
      container: config.container,
      accountName: config.accountName,
      size: file.size,
      mimeType: config.contentType ?? file.mimeType,
      filename: file.name,
      uri: blobClient.url,
      etag: result.etag ?? '',
      lastModified: result.lastModified ?? new Date(),
      encryptionScope: result.encryptionScope ?? config.encryptionScope,
      tier: config.tier,
    };
  } catch (error) {
    throw azureError(error, file.name);
  }
}

/**
 * Upload files one after another. Rejects on the first failure; files uploaded
 * before it are not rolled back.
 */
export async function uploadMultipleToAzureBlob(
  files: FileData[],
  containerClient: AzureBlobContainerClientInterface,
  config: AzureBlobUploadConfig,
): Promise<AzureBlobUploadResponse[]> {
  const results: AzureBlobUploadResponse[] = [];
  for (const file of files) {
    results.push(await uploadToAzureBlob(file, containerClient, config));
  }
  return results;
}

/** Delete a blob. */
export async function deleteFromAzureBlob(
  blobName: string,
  containerClient: AzureBlobContainerClientInterface,
): Promise<void> {
  try {
    await containerClient.getBlockBlobClient(blobName).delete();
  } catch (error) {
    throw azureError(error);
  }
}

/** Whether a blob exists. */
export async function existsInAzureBlob(
  blobName: string,
  containerClient: AzureBlobContainerClientInterface,
): Promise<boolean> {
  try {
    return await containerClient.getBlockBlobClient(blobName).exists();
  } catch (error) {
    throw azureError(error);
  }
}

/**
 * Generate a SAS URL for a blob, signed with the storage account key.
 *
 * @param expiresOn - Expiry time (default: 1 hour from now)
 * @param permissions - SAS permission letters (default: `'r'`, read-only). Only
 *   grant more, e.g. `'rw'`, when the URL holder should be able to modify the blob.
 */
export function getAzureBlobSasUrl(
  blobName: string,
  containerClient: AzureBlobContainerClientInterface,
  storageAccountKey: string,
  expiresOn?: Date,
  permissions = 'r',
): string {
  try {
    if (!containerClient.accountName) {
      throw validationError('Container client has no accountName; cannot sign a SAS URL');
    }
    const credential = new StorageSharedKeyCredential(
      containerClient.accountName,
      storageAccountKey,
    );
    const sasQuery = generateBlobSASQueryParameters(
      {
        containerName: containerClient.containerName,
        blobName,
        permissions: BlobSASPermissions.parse(permissions),
        expiresOn: expiresOn ?? new Date(Date.now() + 3600 * 1000),
      },
      credential,
    ).toString();

    return `${containerClient.getBlockBlobClient(blobName).url}?${sasQuery}`;
  } catch (error) {
    throw azureError(error);
  }
}
