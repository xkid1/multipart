/**
 * Local filesystem storage for parsed multipart files.
 *
 * Uses only Node.js built-ins; no extra dependency is needed.
 *
 * @module @xkid1/multipart/storage/local
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  createStorageError,
  createUniqueName,
  errorMessage,
  isStorageError,
  sanitizeFilename,
  stringProp,
} from '../shared';

import type {
  FileData,
  LocalStorageConfig,
  LocalStorageUploadResponse,
  StorageUploadError,
} from '@types';

/** Upper bound on `name-N.ext` attempts before giving up. */
const MAX_NAME_ATTEMPTS = 1000;

/**
 * Resolve `relativePath` under `root`, rejecting anything that escapes it
 * (`../`, or a sibling directory such as `/uploads-evil` for root `/uploads`).
 * Absolute inputs are treated as relative to `root`.
 */
const resolveInside = (root: string, relativePath: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(path.join(resolvedRoot, relativePath));
  const relative = path.relative(resolvedRoot, resolved);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error('File path is outside base directory');
  }
  return resolved;
};

/** Convert a path relative to `root` into the `/`-separated form we return. */
const toPosixRelative = (root: string, absolutePath: string): string =>
  path.relative(path.resolve(root), absolutePath).split(path.sep).join('/');

/** Candidate names: `a.txt`, `a-1.txt`, `a-2.txt`, ... */
const candidateName = (filename: string, attempt: number): string => {
  if (attempt === 0) return filename;
  const extension = path.extname(filename);
  return `${filename.slice(0, filename.length - extension.length)}-${attempt}${extension}`;
};

/**
 * Write `data` into `directory` under `filename`. Unless `overwrite` is set,
 * an existing file is never replaced; a numeric suffix is added instead. The
 * exclusive `wx` flag makes this safe under concurrent uploads.
 */
const writeWithoutClobbering = async (
  directory: string,
  filename: string,
  data: Buffer,
  overwrite: boolean,
): Promise<string> => {
  if (overwrite) {
    const target = path.join(directory, filename);
    await fs.writeFile(target, data);
    return target;
  }

  for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
    const target = path.join(directory, candidateName(filename, attempt));
    try {
      await fs.writeFile(target, data, { flag: 'wx' });
      return target;
    } catch (error) {
      if (stringProp(error, 'code') !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Could not find a free filename for ${filename}`);
};

/** Wrap any failure into a {@link StorageError} with Node's error code if available. */
const localError = (
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
  filename?: string,
): Error => {
  if (isStorageError(error)) return error;
  return createStorageError(
    {
      code: stringProp(error, 'code') ?? fallbackCode,
      message: errorMessage(error, fallbackMessage),
      statusCode: 500,
      filename,
      details: { error: errorMessage(error, String(error)) },
    },
    error,
  );
};

/**
 * Save a single file to the local filesystem.
 *
 * The client-supplied filename is reduced to a safe basename, so it can never
 * write outside `directory`.
 *
 * @throws {StorageError} If validation or the write fails
 *
 * @example
 * ```typescript
 * const saved = await uploadToLocal(req.files.avatar, {
 *   directory: '/var/uploads',
 *   prefix: 'user-123',
 * });
 * saved.path;         // 'user-123/avatar.png' (or 'user-123/avatar-1.png' if taken)
 * saved.absolutePath; // '/var/uploads/user-123/avatar.png'
 * ```
 */
export async function uploadToLocal(
  file: FileData,
  config: LocalStorageConfig,
): Promise<LocalStorageUploadResponse> {
  try {
    if (!Buffer.isBuffer(file?.buffer)) throw new Error('File data is required');
    if (!config?.directory) throw new Error('Storage directory is required');

    const targetDirectory = resolveInside(config.directory, config.prefix ?? '');
    const filename =
      config.preserveFilename === false
        ? createUniqueName(file.name)
        : sanitizeFilename(file.name);

    await fs.mkdir(targetDirectory, { recursive: true });
    const absolutePath = await writeWithoutClobbering(
      targetDirectory,
      filename,
      file.buffer,
      config.overwrite ?? false,
    );

    if (config.permissions !== undefined)
      await fs.chmod(absolutePath, config.permissions);
    const stats = await fs.stat(absolutePath);

    return {
      path: toPosixRelative(config.directory, absolutePath),
      absolutePath,
      size: stats.size,
      mimeType: file.mimeType || 'application/octet-stream',
      filename: file.name,
      extension: file.extension,
      permissions: stats.mode & 0o777,
      createdAt: stats.mtime,
    };
  } catch (error) {
    throw localError(
      error,
      'LOCAL_UPLOAD_ERROR',
      'Failed to upload file to local storage',
      file?.name,
    );
  }
}

/**
 * Save several files, continuing past failures.
 *
 * @returns The successful uploads, plus one {@link StorageUploadError} per failure
 */
export async function uploadMultipleToLocal(
  files: FileData[],
  config: LocalStorageConfig,
): Promise<{ successful: LocalStorageUploadResponse[]; errors: StorageUploadError[] }> {
  const successful: LocalStorageUploadResponse[] = [];
  const errors: StorageUploadError[] = [];

  for (const file of files) {
    try {
      successful.push(await uploadToLocal(file, config));
    } catch (error) {
      // uploadToLocal always throws a StorageError.
      errors.push(error as StorageUploadError);
    }
  }

  return { successful, errors };
}

/**
 * Delete a file previously saved under `baseDirectory`.
 *
 * @param filePath - Path relative to `baseDirectory` (as returned in `response.path`)
 * @throws {StorageError} If the path escapes `baseDirectory` or deletion fails
 */
export async function deleteFromLocal(
  filePath: string,
  baseDirectory: string,
): Promise<{ success: boolean; path: string }> {
  try {
    if (!filePath || !baseDirectory) {
      throw new Error('File path and base directory are required');
    }

    const absolutePath = resolveInside(baseDirectory, filePath);
    if (absolutePath === path.resolve(baseDirectory))
      throw new Error('Invalid file path');

    await fs.unlink(absolutePath);
    return { success: true, path: toPosixRelative(baseDirectory, absolutePath) };
  } catch (error) {
    throw localError(
      error,
      'LOCAL_DELETE_ERROR',
      'Failed to delete file from local storage',
      filePath,
    );
  }
}

/**
 * Whether a file exists under `baseDirectory`. Paths that escape it return `false`.
 */
export async function existsInLocal(
  filePath: string,
  baseDirectory: string,
): Promise<boolean> {
  try {
    const stats = await fs.stat(resolveInside(baseDirectory, filePath));
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Build a public URL for a stored file, percent-encoding each path segment.
 *
 * @example
 * getLocalFileUrl('user 1/report.pdf', 'https://cdn.example.com/uploads/');
 * // 'https://cdn.example.com/uploads/user%201/report.pdf'
 */
export function getLocalFileUrl(filePath: string, baseUrl: string): string {
  const encodedPath = filePath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  return `${baseUrl.replace(/\/+$/, '')}/${encodedPath}`;
}
