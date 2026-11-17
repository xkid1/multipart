import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  deleteFromLocal,
  getLocalFileUrl,
  uploadMultipleToLocal,
  uploadToLocal,
} from './local-uploader';

import type { FileData, LocalStorageConfig } from '@types';

describe('local-uploader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-storage-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const createMockFile = (name = 'test.txt', content = 'hello world'): FileData => ({
    name,
    mimeType: 'text/plain',
    size: Buffer.byteLength(content),
    encoding: 'utf-8',
    extension: 'txt',
    buffer: Buffer.from(content),
  });

  describe('uploadToLocal', () => {
    it('should successfully upload a file to local directory', async () => {
      const file = createMockFile();
      const config: LocalStorageConfig = {
        directory: tempDir,
        prefix: 'subfolder/',
      };

      const result = await uploadToLocal(file, config);

      expect(result.filename).toBe('test.txt');
      expect(result.path).toBe('subfolder/test.txt');
      expect(result.size).toBe(file.size);
      expect(result.mimeType).toBe('text/plain');

      const savedContent = await fs.readFile(result.absolutePath, 'utf-8');
      expect(savedContent).toBe('hello world');
    });

    it('should support permissions configuration', async () => {
      const file = createMockFile();
      const config: LocalStorageConfig = {
        directory: tempDir,
        permissions: 0o644,
      };

      const result = await uploadToLocal(file, config);
      expect(result.permissions).toBe(0o644);
    });

    it('should throw error when file or buffer is missing', async () => {
      const config: LocalStorageConfig = { directory: tempDir };
      await expect(uploadToLocal(null as any, config)).rejects.toThrow(
        'File data is required',
      );
    });

    it('should throw error when directory is missing', async () => {
      const file = createMockFile();
      await expect(uploadToLocal(file, {} as any)).rejects.toThrow(
        'Storage directory is required',
      );
    });
  });

  describe('uploadMultipleToLocal', () => {
    it('should upload multiple files and return success & errors', async () => {
      const file1 = createMockFile('file1.txt', 'one');
      const file2 = createMockFile('file2.txt', 'two');
      const invalidFile = { ...createMockFile('file3.txt'), buffer: null as any };

      const config: LocalStorageConfig = { directory: tempDir };
      const result = await uploadMultipleToLocal([file1, file2, invalidFile], config);

      expect(result.successful).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('LOCAL_UPLOAD_ERROR');
    });
  });

  describe('deleteFromLocal', () => {
    it('should delete an existing file', async () => {
      const filePath = path.join(tempDir, 'delete-me.txt');
      await fs.writeFile(filePath, 'to be deleted');

      const result = await deleteFromLocal('delete-me.txt', tempDir);
      expect(result.success).toBe(true);

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should reject file paths resolving outside base directory', async () => {
      await expect(deleteFromLocal('../../etc/passwd', tempDir)).rejects.toThrow();
    });

    it('should reject directory traversal attempts', async () => {
      await expect(deleteFromLocal('../outside.txt', tempDir)).rejects.toThrow(
        'Invalid file path',
      );
    });

    it('should reject empty parameters', async () => {
      await expect(deleteFromLocal('', tempDir)).rejects.toThrow(
        'File path and base directory are required',
      );
    });
  });

  describe('getLocalFileUrl', () => {
    it('should construct clean file URLs', () => {
      const url = getLocalFileUrl('sub\\file.txt', 'https://example.com/uploads/');
      expect(url).toBe('https://example.com/uploads/sub/file.txt');
    });
  });
});
