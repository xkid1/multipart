/**
 * Local filesystem storage uploader
 *
 * Saves uploaded files to the local filesystem with configurable permissions,
 * naming, and directory structure.
 *
 * @module @xkid1/multipart/storage/local
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { MultiPartError } from '@utils';

import type {
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  StorageUploadError,
} from '@types';

/**
 * Wrap a StorageUploadError in an Error object for throwing
 *
 * @param storageError - The StorageUploadError to wrap
 * @returns Error object with StorageUploadError properties
 */
function wrapStorageError(storageError: StorageUploadError): Error {
  const err = new MultiPartError(storageError.message);
  Object.assign(err, storageError);
  return err;
}

/**
 * Upload a single file to local filesystem
 *
 * @param file - File data to upload
 * @param config - Local storage configuration
 * @returns Upload response with file path and metadata
 *
 * @throws StorageUploadError if upload fails
 *
 * @example
 * ```typescript
 * import { uploadToLocal } from '@xkid1/multipart/storage/local';
 *
 * const config: LocalStorageConfig = {
 *   directory: '/var/uploads',
 *   prefix: 'user-123/',
 *   permissions: 0o644
 * };
 *
 * const response = await uploadToLocal(fileData, config);
 * console.log(response.path); // 'user-123/document.pdf'
 * console.log(response.absolutePath); // '/var/uploads/user-123/document.pdf'
 * ```
 */
export async function uploadToLocal(
  file: FileData,
  config: LocalStorageConfig,
): Promise<LocalStorageUploadResponse> {
  try {
    if (!file) {
      throw new Error('File data is required');
    }

    if (!config.directory) {
      throw new Error('Storage directory is required');
    }

    // Sanitize filename to prevent directory traversal
    const basename = path.basename(file.name);

    // Build final path with prefix
    const prefix = config.prefix ? config.prefix.replace(/\/$/, '') : '';
    const relativePath = prefix ? `${prefix}/${basename}` : basename;
    const absolutePath = path.join(config.directory, relativePath);

    // Ensure the directory exists
    const dirPath = path.dirname(absolutePath);
    await fs.mkdir(dirPath, { recursive: true });

    // Write file to disk
    await fs.writeFile(absolutePath, file.buffer);

    // Apply permissions if specified
    if (config.permissions) {
      await fs.chmod(absolutePath, config.permissions);
    }

    // Get file stats
    const stats = await fs.stat(absolutePath);

    return {
      path: relativePath,
      absolutePath,
      size: stats.size,
      mimeType: file.mimeType ?? 'application/octet-stream',
      filename: file.name,
      extension: file.extension ?? '',
      permissions: config.permissions ?? 0o644,
      createdAt: stats.mtime,
    };
  } catch (error) {
    const storageError: StorageUploadError = {
      code:
        error instanceof Error
          ? (((error as unknown as Record<string, unknown>).code as string) ??
            'LOCAL_UPLOAD_ERROR')
          : 'LOCAL_UPLOAD_ERROR',
      message:
        error instanceof Error ? error.message : 'Failed to upload file to local storage',
      statusCode: 500,
      filename: file?.name,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
    throw wrapStorageError(storageError);
  }
}

/**
 * Upload multiple files to local filesystem
 *
 * @param files - Array of files to upload
 * @param config - Local storage configuration
 * @returns Array of successful uploads and any errors
 *
 * @example
 * ```typescript
 * const results = await uploadMultipleToLocal(fileArray, config);
 * results.successful.forEach(upload => {
 *   console.log('Uploaded:', upload.filename, 'to', upload.path);
 * });
 * results.errors.forEach(error => {
 *   console.error('Failed:', error.filename, error.message);
 * });
 * ```
 */
export async function uploadMultipleToLocal(
  files: FileData[],
  config: LocalStorageConfig,
): Promise<{
  successful: LocalStorageUploadResponse[];
  errors: StorageUploadError[];
}> {
  const successful: LocalStorageUploadResponse[] = [];
  const errors: StorageUploadError[] = [];

  for (const file of files) {
    try {
      const result = await uploadToLocal(file, config);
      successful.push(result);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const storageError = error as unknown as StorageUploadError;
        errors.push(storageError);
      } else {
        errors.push({
          code: 'LOCAL_UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500,
        });
      }
    }
  }

  return { successful, errors };
}

/**
 * Delete a file from local filesystem
 *
 * @param filePath - Relative path to the file
 * @param baseDirectory - Base directory for storage
 * @returns Confirmation of deletion
 *
 * @throws StorageUploadError if deletion fails
 *
 * @example
 * ```typescript
 * await deleteFromLocal('user-123/old-file.pdf', '/var/uploads');
 * ```
 */
export async function deleteFromLocal(
  filePath: string,
  baseDirectory: string,
): Promise<{ success: boolean; path: string }> {
  try {
    if (!filePath || !baseDirectory) {
      throw new Error('File path and base directory are required');
    }

    // Prevent directory traversal attacks
    const sanitizedPath = path.normalize(filePath);
    if (sanitizedPath.startsWith('..')) {
      throw new Error('Invalid file path');
    }

    const absolutePath = path.join(baseDirectory, sanitizedPath);

    // Verify the path is within baseDirectory
    const resolvedBase = path.resolve(baseDirectory);
    const resolvedPath = path.resolve(absolutePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error('File path is outside base directory');
    }

    await fs.unlink(absolutePath);

    return {
      success: true,
      path: sanitizedPath,
    };
  } catch (error) {
    const storageError: StorageUploadError = {
      code:
        error instanceof Error
          ? (((error as unknown as Record<string, unknown>).code as string) ??
            'LOCAL_DELETE_ERROR')
          : 'LOCAL_DELETE_ERROR',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to delete file from local storage',
      statusCode: 500,
      filename: filePath,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
    throw wrapStorageError(storageError);
  }
}

/**
 * Get a public URL for a local file
 *
 * Constructs a URL based on the base URL and relative file path.
 * Useful for serving files via a web server.
 *
 * @param filePath - Relative path to the file
 * @param baseUrl - Public base URL (e.g., 'https://example.com/uploads')
 * @returns Public URL for the file
 *
 * @example
 * ```typescript
 * const url = getLocalFileUrl('user-123/document.pdf', 'https://cdn.example.com/uploads');
 * // Returns: 'https://cdn.example.com/uploads/user-123/document.pdf'
 * ```
 */
export function getLocalFileUrl(filePath: string, baseUrl: string): string {
  const cleanPath = filePath.replace(/\\/g, '/');
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/${cleanPath}`;
}
