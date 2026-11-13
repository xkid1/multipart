/**
 * AWS S3 file upload utility for multipart parsed files
 *
 * This module provides utilities for uploading parsed multipart files to AWS S3.
 * AWS SDK for JavaScript (v3) must be installed separately:
 *
 * @example
 * ```bash
 * npm install @aws-sdk/client-s3
 * ```
 *
 * @module @xkid1/multipart/storage/s3
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { MultiPartError } from '@utils';

import type {
  FileData,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
  StorageUploadError,
} from '@types';

/**
 * Upload a single file to AWS S3
 *
 * @param file - Parsed file data from multipart parser
 * @param s3Client - Configured S3Client instance
 * @param config - S3 upload configuration
 * @returns Promise resolving to S3 upload response
 * @throws {StorageUploadError} If upload fails
 *
 * @example
 * ```typescript
 * import { multipart } from '@xkid1/multipart/middleware/express';
 * import { uploadToS3 } from '@xkid1/multipart/storage/s3';
 * import { S3Client } from '@aws-sdk/client-s3';
 *
 * const s3Client = new S3Client({ region: 'us-east-1' });
 *
 * app.post('/upload', multipart(), async (req, res) => {
 *   try {
 *     const file = req.files?.['file'];
 *
 *     const result = await uploadToS3(file, s3Client, {
 *       bucket: 'my-bucket',
 *       region: 'us-east-1',
 *       prefix: 'uploads/'
 *     });
 *
 *     res.json({ success: true, s3: result });
 *   } catch (error) {
 *     res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
 *   }
 * });
 * ```
 */
export async function uploadToS3(
  file: FileData,
  s3Client: S3ClientInterface,
  config: S3UploadConfig,
): Promise<S3UploadResponse> {
  try {
    if (!file?.buffer) {
      throw new Error('Invalid file data: missing buffer');
    }

    if (!config.bucket) {
      throw new Error('S3 bucket name is required');
    }

    if (!config.region) {
      throw new Error('AWS region is required');
    }

    // Import dynamically to avoid requiring @aws-sdk/client-s3 as a dependency
    // const { PutObjectCommand } = await import('@aws-sdk/client-s3');

    // Generate S3 object key
    const timestamp = Date.now();
    const key = `${config.prefix ?? ''}${timestamp}-${file.name}`;

    // Build put object params - cast as unknown to handle AWS SDK type complexities
    const params = {
      Bucket: config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: config.contentType ?? file.mimeType ?? 'application/octet-stream',
      Metadata: config.metadata ?? {},
      ...(config.acl && { ACL: config.acl }),
      ...(config.serverSideEncryption && {
        ServerSideEncryption: config.serverSideEncryption as unknown,
      }),
      ...(config.sseKmsKeyId && { SSEKMSKeyId: config.sseKmsKeyId }),
      ...(config.storageClass && { StorageClass: config.storageClass }),
      ...(config.tagging && {
        Tagging: Object.entries(config.tagging)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&'),
      }),
    } as unknown;

    // Execute upload
    const command = new PutObjectCommand(params as PutObjectCommandInput);
    const response = (await s3Client.send(command)) as Record<string, unknown>;

    // Construct full S3 URL
    const url = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

    return {
      key,
      bucket: config.bucket,
      region: config.region,
      size: file.size ?? file.buffer.length,
      mimeType: file.mimeType ?? 'application/octet-stream',
      filename: file.name ?? 'unknown',
      versionId: (response.VersionId as string) ?? undefined,
      url,
      etag: (response.ETag as string) ?? '',
      serverSideEncryption: (response.ServerSideEncryption as string) ?? undefined,
    };
  } catch (error) {
    throw createS3Error(error, file?.name);
  }
}

/**
 * Upload multiple files to AWS S3
 *
 * @param files - Array of parsed file data
 * @param s3Client - Configured S3Client instance
 * @param config - S3 upload configuration
 * @returns Promise resolving to array of S3 upload responses
 * @throws {StorageUploadError} If any upload fails
 */
export async function uploadMultipleToS3(
  files: FileData[],
  s3Client: S3ClientInterface,
  config: S3UploadConfig,
): Promise<S3UploadResponse[]> {
  const results: S3UploadResponse[] = [];

  for (const file of files) {
    const result = await uploadToS3(file, s3Client, config);
    results.push(result);
  }

  return results;
}

/**
 * Delete a file from AWS S3
 *
 * @param key - S3 object key to delete
 * @param s3Client - Configured S3Client instance
 * @param bucket - S3 bucket name
 */
export async function deleteFromS3(
  key: string,
  s3Client: S3ClientInterface,
  bucket: string,
): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    throw createS3Error(error);
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 *
 * Requires `@aws-sdk/s3-request-presigner` to be installed separately:
 * ```bash
 * npm install @aws-sdk/s3-request-presigner
 * ```
 *
 * @param key - S3 object key
 * @param s3Client - Configured S3Client instance
 * @param bucket - S3 bucket name
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Promise resolving to pre-signed URL string
 * @throws Error if @aws-sdk/s3-request-presigner is not installed
 */
export async function getS3PresignedUrl(
  key: string,
  s3Client: S3ClientInterface,
  bucket: string,
  expiresIn = 3600,
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('@aws-sdk/s3-request-presigner')
    ) {
      throw error;
    }
    throw createS3Error(error);
  }
}

/**
 * Create a structured S3 error object wrapped in an Error
 *
 * @param error - Original error from AWS SDK or unknown error
 * @param filename - Optional filename associated with error
 * @returns Error with StorageUploadError data
 */
function createS3Error(error: unknown, filename?: string): Error {
  const errorObj = error as Record<string, unknown>;
  const metadata = errorObj.$metadata as Record<string, unknown> | undefined;
  const statusCode = (metadata?.httpStatusCode as number) ?? 500;
  const code = (errorObj.name as string) ?? (errorObj.Code as string) ?? 'S3_ERROR';
  const message =
    error instanceof Error
      ? error.message
      : ((errorObj.message as string) ?? 'Unknown S3 error');

  const storageError: StorageUploadError = {
    code,
    message,
    statusCode,
    filename,
    details: {
      awsCode: errorObj.Code,
      awsMessage: message,
    },
  };

  const err = new MultiPartError(message);
  Object.assign(err, storageError);
  return err;
}
