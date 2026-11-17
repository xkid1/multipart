/**
 * Azure Blob Storage file upload utility for multipart parsed files
 *
 * This module provides utilities for uploading parsed multipart files to Azure Blob Storage.
 * Azure SDK for JavaScript must be installed separately:
 *
 * @example
 * ```bash
 * npm install @azure/storage-blob
 * ```
 *
 * @module @xkid1/multipart/storage/azure
 */

import path from 'node:path';

import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

import { MultiPartError } from '@utils';

import type {
  AzureBlobContainerClientInterface,
  AzureBlobUploadConfig,
  AzureBlobUploadResponse,
  FileData,
  StorageUploadError,
} from '@types';

/**
 * Upload a single file to Azure Blob Storage
 *
 * @param file - Parsed file data from multipart parser
 * @param containerClient - Azure BlobContainerClient instance
 * @param config - Azure Blob upload configuration
 * @returns Promise resolving to Azure Blob upload response
 * @throws {StorageUploadError} If upload fails
 *
 * @example
 * ```typescript
 * import { multipart } from '@xkid1/multipart/middleware/express';
 * import { uploadToAzureBlob } from '@xkid1/multipart/storage/azure';
 * import { BlobServiceClient } from '@azure/storage-blob';
 *
 * const blobServiceClient = BlobServiceClient.fromConnectionString(
 *   process.env.AZURE_STORAGE_CONNECTION_STRING
 * );
 * const containerClient = blobServiceClient.getContainerClient('uploads');
 *
 * app.post('/upload', multipart(), async (req, res) => {
 *   try {
 *     const file = req.files?.['file'];
 *
 *     const result = await uploadToAzureBlob(file, containerClient, {
 *       accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
 *       container: 'uploads',
 *       prefix: 'user-uploads/'
 *     });
 *
 *     res.json({ success: true, azure: result });
 *   } catch (error) {
 *     res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
 *   }
 * });
 * ```
 */
export async function uploadToAzureBlob(
  file: FileData,
  containerClient: AzureBlobContainerClientInterface,
  config: AzureBlobUploadConfig,
): Promise<AzureBlobUploadResponse> {
  try {
    if (!file?.buffer) {
      throw new Error('Invalid file data: missing buffer');
    }

    if (!config.container) {
      throw new Error('Azure container name is required');
    }

    if (!config.accountName) {
      throw new Error('Azure account name is required');
    }

    // Generate blob name with sanitized filename
    const timestamp = Date.now();
    const sanitizedFilename = path.basename(file.name);
    const blobName = `${config.prefix ?? ''}${timestamp}-${sanitizedFilename}`;

    // Build upload options
    const uploadOptions: Record<string, unknown> = {
      blobHTTPHeaders: {
        blobContentType:
          config.contentType ?? file.mimeType ?? 'application/octet-stream',
      },
      metadata: config.metadata ?? {},
    };

    // Add optional parameters if provided
    if (config.tier) {
      uploadOptions.tier = config.tier;
    }

    if (config.encryptionScope) {
      uploadOptions.encryptionScope = config.encryptionScope;
    }

    // Get blob client and upload
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.upload(file.buffer, file.buffer.length, uploadOptions);

    // Get blob properties for additional info
    const properties = await blobClient.getProperties();

    // Construct blob URI
    const uri = blobClient.url;

    return {
      name: blobName,
      container: config.container,
      accountName: config.accountName,
      size: file.size,
      mimeType: config.contentType ?? file.mimeType,
      filename: file.name,
      uri,
      etag: properties.etag ?? '',
      lastModified: properties.lastModified ?? new Date(),
      encryptionScope: properties.encryptionScope,
      tier: properties.accessTier,
    };
  } catch (error) {
    throw createAzureError(error, file?.name);
  }
}

/**
 * Upload multiple files to Azure Blob Storage
 *
 * @param files - Array of parsed file data
 * @param containerClient - Azure BlobContainerClient instance
 * @param config - Azure Blob upload configuration
 * @returns Promise resolving to array of Azure Blob upload responses
 * @throws {StorageUploadError} If any upload fails
 */
export async function uploadMultipleToAzureBlob(
  files: FileData[],
  containerClient: AzureBlobContainerClientInterface,
  config: AzureBlobUploadConfig,
): Promise<AzureBlobUploadResponse[]> {
  const results: AzureBlobUploadResponse[] = [];

  for (const file of files) {
    const result = await uploadToAzureBlob(file, containerClient, config);
    results.push(result);
  }

  return results;
}

/**
 * Delete a blob from Azure Blob Storage
 *
 * @param blobName - Blob name to delete
 * @param containerClient - Azure BlobContainerClient instance
 */
export async function deleteFromAzureBlob(
  blobName: string,
  containerClient: AzureBlobContainerClientInterface,
): Promise<void> {
  try {
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.delete();
  } catch (error) {
    throw createAzureError(error);
  }
}

/**
 * Generate a SAS (Shared Access Signature) URL for a blob
 *
 * @param blobName - Blob name
 * @param containerClient - Azure BlobContainerClient instance
 * @param storageAccountKey - Storage account key for signing (required)
 * @param expiresOn - URL expiration date (default: 1 hour from now)
 * @returns Resolving to SAS URL string
 */
export function getAzureBlobSasUrl(
  blobName: string,
  containerClient: AzureBlobContainerClientInterface,
  storageAccountKey: string,
  expiresOn?: Date,
): string {
  try {
    const expirationDate = expiresOn ?? new Date(Date.now() + 3600 * 1000);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    const accountName = containerClient.accountName ?? '';
    const credential = new StorageSharedKeyCredential(accountName, storageAccountKey);

    const sasQuery = generateBlobSASQueryParameters(
      {
        containerName: containerClient.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('racwd'),
        expiresOn: expirationDate,
      },
      credential,
    ).toString();

    return `${blobClient.url}?${sasQuery}`;
  } catch (error) {
    throw createAzureError(error);
  }
}

/**
 * Create a structured Azure error object wrapped in an Error
 *
 * @param error - Original error from Azure SDK or unknown error
 * @param filename - Optional filename associated with error
 * @returns Error with StorageUploadError data
 */
function createAzureError(error: unknown, filename?: string): Error {
  const errorObj = (error ?? {}) as Record<string, unknown>;
  const rawStatusCode = errorObj.statusCode;
  const rawCode = errorObj.code;
  const rawMessage = error instanceof Error ? error.message : errorObj.message;

  const statusCode = typeof rawStatusCode === 'number' ? rawStatusCode : 500;
  const codeValue = typeof rawCode === 'string' ? rawCode : 'AZURE_BLOB_ERROR';
  const messageValue =
    typeof rawMessage === 'string' ? rawMessage : 'Unknown Azure Blob Storage error';

  const storageError: StorageUploadError = {
    code: codeValue,
    message: messageValue,
    statusCode,
    filename,
    details: {
      azureCode: rawCode,
      azureMessage: error instanceof Error ? error.message : undefined,
      azureDetails: errorObj.details,
    },
  };

  const err = new MultiPartError(messageValue);
  Object.assign(err, storageError);
  return err;
}
