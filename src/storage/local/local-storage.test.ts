import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LocalStorage } from './local-storage';
import {
  deleteFromLocal,
  existsInLocal,
  getLocalFileUrl,
  uploadMultipleToLocal,
  uploadToLocal,
} from './local-uploader';

import type { FileData } from '@types';

const file = (name: string, content = 'data'): FileData => ({
  name,
  mimeType: 'text/plain',
  size: Buffer.byteLength(content),
  encoding: 'utf-8',
  extension: '.txt',
  buffer: Buffer.from(content),
});

describe('local storage hardening', () => {
  let root: string;
  let directory: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-hardening-'));
    directory = path.join(root, 'uploads');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('never silently overwrites a file with the same name', async () => {
    const first = await uploadToLocal(file('report.pdf', 'one'), { directory });
    const second = await uploadToLocal(file('report.pdf', 'two'), { directory });
    const third = await uploadToLocal(file('report.pdf', 'three'), { directory });

    expect([first.path, second.path, third.path]).toEqual([
      'report.pdf',
      'report-1.pdf',
      'report-2.pdf',
    ]);
    expect(await fs.readFile(first.absolutePath, 'utf8')).toBe('one');
    expect(await fs.readFile(second.absolutePath, 'utf8')).toBe('two');
  });

  it('handles concurrent uploads of the same name without losing data', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        uploadToLocal(file('same.txt', String(i)), { directory }),
      ),
    );
    const contents = await Promise.all(
      results.map((r) => fs.readFile(r.absolutePath, 'utf8')),
    );

    expect(new Set(results.map((r) => r.path)).size).toBe(10);
    expect(contents.sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('overwrites only when overwrite: true', async () => {
    await uploadToLocal(file('a.txt', 'old'), { directory });
    const result = await uploadToLocal(file('a.txt', 'new'), {
      directory,
      overwrite: true,
    });

    expect(result.path).toBe('a.txt');
    expect(await fs.readFile(result.absolutePath, 'utf8')).toBe('new');
  });

  it('generates unique names with preserveFilename: false', async () => {
    const result = await uploadToLocal(file('a.txt'), {
      directory,
      preserveFilename: false,
    });
    expect(result.path).toMatch(/^\d+-[0-9a-f]{8}-a\.txt$/);
  });

  it.each([
    ['../../escape.txt', 'escape.txt'],
    ['..\\..\\escape.txt', 'escape.txt'],
    ['..', 'file'],
    ['', 'file'],
    ['bad\u0000name.txt', 'badname.txt'],
  ])('keeps client filename %j inside the directory as %s', async (name, expected) => {
    const result = await uploadToLocal(file(name), { directory });
    expect(result.path).toBe(expected);
    expect(result.absolutePath.startsWith(directory + path.sep)).toBe(true);
  });

  it('rejects a prefix that escapes the directory', async () => {
    await expect(
      uploadToLocal(file('a.txt'), { directory, prefix: '../outside' }),
    ).rejects.toThrow('outside base directory');
  });

  it('reports the real permission bits', async () => {
    const result = await uploadToLocal(file('a.txt'), { directory, permissions: 0o600 });
    expect(result.permissions).toBe(0o600);
    expect((await fs.stat(result.absolutePath)).mode & 0o777).toBe(0o600);
  });

  it('collects per-file errors in uploadMultipleToLocal', async () => {
    const result = await uploadMultipleToLocal(
      [file('ok.txt'), { ...file('bad.txt'), buffer: undefined as unknown as Buffer }],
      { directory },
    );
    expect(result.successful).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: 'LOCAL_UPLOAD_ERROR',
      filename: 'bad.txt',
    });
  });

  describe('deleteFromLocal', () => {
    it('cannot delete in a sibling directory that shares the name prefix', async () => {
      const sibling = `${directory}-evil`;
      await fs.mkdir(sibling, { recursive: true });
      await fs.writeFile(path.join(sibling, 'victim.txt'), 'x');
      await fs.mkdir(directory, { recursive: true });

      await expect(
        deleteFromLocal(`../${path.basename(sibling)}/victim.txt`, directory),
      ).rejects.toThrow('outside base directory');
      await expect(fs.access(path.join(sibling, 'victim.txt'))).resolves.toBeUndefined();
    });

    it('refuses to delete the base directory itself', async () => {
      await fs.mkdir(directory, { recursive: true });
      await expect(deleteFromLocal('.', directory)).rejects.toThrow('Invalid file path');
    });

    it('reports a missing file with its Node error code', async () => {
      await fs.mkdir(directory, { recursive: true });
      await expect(deleteFromLocal('missing.txt', directory)).rejects.toMatchObject({
        code: 'ENOENT',
        filename: 'missing.txt',
      });
    });
  });

  it('existsInLocal reports files, and false for directories and escapes', async () => {
    const saved = await uploadToLocal(file('a.txt'), { directory, prefix: 'sub' });

    expect(await existsInLocal(saved.path, directory)).toBe(true);
    expect(await existsInLocal('sub', directory)).toBe(false);
    expect(await existsInLocal('nope.txt', directory)).toBe(false);
    expect(await existsInLocal('../uploads/sub/a.txt', path.join(directory, 'sub'))).toBe(
      false,
    );
  });

  it('getLocalFileUrl percent-encodes path segments', () => {
    expect(getLocalFileUrl('user 1\\r#1.pdf', 'https://cdn.example.com/u//')).toBe(
      'https://cdn.example.com/u/user%201/r%231.pdf',
    );
  });

  it('LocalStorage implements the StorageAdapter contract', async () => {
    const storage = new LocalStorage({ directory, prefix: 'adapter' });

    const saved = await storage.upload(file('a.txt'));
    const many = await storage.uploadMany([file('b.txt'), file('c.txt')]);
    expect(many.map((r) => r.path)).toEqual(['adapter/b.txt', 'adapter/c.txt']);
    expect(await storage.exists(saved.path)).toBe(true);

    await storage.delete(saved.path);
    expect(await storage.exists(saved.path)).toBe(false);
    expect(storage.getUrl(saved.path, 'https://x.test')).toBe(
      'https://x.test/adapter/a.txt',
    );
  });
});
