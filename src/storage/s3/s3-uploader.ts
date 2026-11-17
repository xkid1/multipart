/**
 * AWS S3 storage for parsed multipart files.
 *
 * Requires the AWS SDK v3 S3 client:
 * ```bash
 * npm install @aws-sdk/client-s3
 * ```
 *
 * @module @xkid1/multipart/storage/s3
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

import { MultiPartError } from '@utils';

import {
  createStorageError,
  createUniqueName,
  encodeKeyForUrl,
  errorMessage,
  isStorageError,
  resolveContentDisposition,
  stringProp,
} from '../shared';

import type {
  FileData,
  S3ClientInterface,
  S3UploadConfig,
  S3UploadResponse,
} from '@types';

/** Map an AWS SDK error (or anything else) to a {@link StorageError}. */
const s3Error = (error: unknown, filename?: string): Error => {
  if (isStorageError(error)) return error;

  const status = (error as { $metadata?: { httpStatusCode?: unknown } } | null)?.$metadata
    ?.httpStatusCode;
  const message = errorMessage(error, 'Unknown S3 error');

  return createStorageError(
    {
      code: stringProp(error, 'name') ?? stringProp(error, 'Code') ?? 'S3_ERROR',
      message,
      statusCode: typeof status === 'number' ? status : 500,
      filename,
      details: { awsCode: stringProp(error, 'Code'), awsMessage: message },
    },
    error,
  );
};

const validationError = (message: string, filename?: string): Error =>
  createStorageError({ code: 'S3_VALIDATION_ERROR', message, statusCode: 400, filename });

/** Encode a tag set as the URL query string S3 expects in `Tagging`. */
const encodeTagging = (tags: Record<string, string>): string =>
  Object.entries(tags)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

/** Build the PutObject input from the file and config, omitting unset options. */
const buildPutObjectInput = (
  file: FileData,
  key: string,
  config: S3UploadConfig,
): PutObjectCommandInput => {
  const contentDisposition = resolveContentDisposition(
    file.name,
    config.contentDisposition,
  );
  return {
    Bucket: config.bucket,
    Key: key,
    Body: file.buffer,
    ContentType: config.contentType ?? (file.mimeType || 'application/octet-stream'),
    ContentLength: file.buffer.byteLength,
    Metadata: config.metadata ?? {},
    ...(contentDisposition && { ContentDisposition: contentDisposition }),
    ...(config.acl && { ACL: config.acl }),
    ...(config.serverSideEncryption && {
      ServerSideEncryption:
        config.serverSideEncryption as PutObjectCommandInput['ServerSideEncryption'],
    }),
    ...(config.sseKmsKeyId && { SSEKMSKeyId: config.sseKmsKeyId }),
    ...(config.storageClass && {
      StorageClass: config.storageClass as PutObjectCommandInput['StorageClass'],
    }),
    ...(config.tagging && { Tagging: encodeTagging(config.tagging) }),
  };
};

/**
 * Upload a single file to S3 under `<prefix><timestamp>-<random>-<filename>`.
 *
 * @throws {StorageError} If validation or the upload fails
 *
 * @example
 * ```typescript
 * import { S3Client } from '@aws-sdk/client-s3';
 * import { uploadToS3 } from '@xkid1/multipart/storage/s3';
 *
 * const s3 = new S3Client({ region: 'us-east-1' });
 * const result = await uploadToS3(req.files.avatar, s3, {
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   prefix: 'uploads/',
 * });
 * ```
 */
export async function uploadToS3(
  file: FileData,
  s3Client: S3ClientInterface,
  config: S3UploadConfig,
): Promise<S3UploadResponse> {
  if (!Buffer.isBuffer(file?.buffer))
    throw validationError('Invalid file data: missing buffer');
  if (!config?.bucket) throw validationError('S3 bucket name is required', file.name);
  if (!config.region) throw validationError('AWS region is required', file.name);

  const key = createUniqueName(file.name, config.prefix);

  try {
    const response = (await s3Client.send(
      new PutObjectCommand(buildPutObjectInput(file, key, config)),
    )) as
      { VersionId?: string; ETag?: string; ServerSideEncryption?: string } | undefined;

    return {
      key,
      bucket: config.bucket,
      region: config.region,
      size: file.size,
      mimeType: config.contentType ?? file.mimeType,
      filename: file.name,
      versionId: response?.VersionId,
      url: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${encodeKeyForUrl(key)}`,
      etag: response?.ETag ?? '',
      serverSideEncryption: response?.ServerSideEncryption,
    };
  } catch (error) {
    throw s3Error(error, file.name);
  }
}

/**
 * Upload files one after another. Rejects on the first failure; files uploaded
 * before it are not rolled back.
 */
export async function uploadMultipleToS3(
  files: FileData[],
  s3Client: S3ClientInterface,
  config: S3UploadConfig,
): Promise<S3UploadResponse[]> {
  const results: S3UploadResponse[] = [];
  for (const file of files) results.push(await uploadToS3(file, s3Client, config));
  return results;
}

/** Delete an object from S3. */
export async function deleteFromS3(
  key: string,
  s3Client: S3ClientInterface,
  bucket: string,
): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    throw s3Error(error);
  }
}

/** Whether an object exists in S3 (via `HeadObject`). Other errors are rethrown. */
export async function existsInS3(
  key: string,
  s3Client: S3ClientInterface,
  bucket: string,
): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } } | null)
      ?.$metadata?.httpStatusCode;
    if (status === 404 || stringProp(error, 'name') === 'NotFound') return false;
    throw s3Error(error);
  }
}

const isModuleNotFound = (error: unknown): boolean => {
  const code = stringProp(error, 'code');
  return code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND';
};

/**
 * Generate a pre-signed GET URL for an object.
 *
 * Requires `@aws-sdk/s3-request-presigner` (`npm install @aws-sdk/s3-request-presigner`).
 *
 * @param expiresIn - Seconds until the URL expires (default: 3600)
 */
export async function getS3PresignedUrl(
  key: string,
  s3Client: S3ClientInterface,
  bucket: string,
  expiresIn = 3600,
): Promise<string> {
  try {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    return await getSignedUrl(
      s3Client as Parameters<typeof getSignedUrl>[0],
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn },
    );
  } catch (error) {
    if (isModuleNotFound(error)) {
      throw new MultiPartError(
        'Package @aws-sdk/s3-request-presigner is required to generate presigned URLs. Please install it with: npm install @aws-sdk/s3-request-presigner',
        'MISSING_DEPENDENCY',
        { cause: error },
      );
    }
    throw s3Error(error);
  }
}
