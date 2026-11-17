import { EventEmitter } from 'node:events';

import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { createMultipartNestjs, MultipartNestjs, multipartNestjs } from './index.js';

describe('nestjs middleware', () => {
  const createMockReq = (headers: Record<string, string | string[]> = {}) => {
    const emitter = new EventEmitter() as any;
    emitter.headers = headers;
    emitter.method = 'POST';
    emitter.resume = vi.fn();
    return emitter;
  };

  const createMockRes = () => ({}) as any;

  const multipartHeaders = (boundary: string) => ({
    'content-type': `multipart/form-data; boundary=${boundary}`,
  });

  const fileBody = (boundary: string, mimeType = 'text/plain') =>
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="f"; filename="a.txt"\r\nContent-Type: ${mimeType}\r\n\r\nTOOBIG\r\n--${boundary}--\r\n`,
    );

  /** Run the middleware on a body and return what it passed to next(). */
  const run = async (
    middleware: { use: MultipartNestjs['use'] },
    req: any,
    chunks: Buffer[] = [],
  ) => {
    const next = vi.fn();
    const promise = middleware.use(req, createMockRes(), next);
    for (const chunk of chunks) req.emit('data', chunk);
    req.emit('end');
    await promise;
    expect(next).toHaveBeenCalledTimes(1);
    return next.mock.calls[0][0];
  };

  it('should ignore non-multipart requests', async () => {
    const req = createMockReq({ 'content-type': 'application/json' });
    expect(await run(new MultipartNestjs(), req)).toBeUndefined();
  });

  it('should pass a 400 HttpException when boundary is missing', async () => {
    const err = await run(
      new MultipartNestjs(),
      createMockReq({ 'content-type': 'multipart/form-data' }),
    );

    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(400);
    expect(err.message).toContain('No boundary found');
    expect(err.getResponse()).toMatchObject({ error: 'NO_BOUNDARY' });
  });

  it('should successfully parse valid multipart body', async () => {
    const boundary = 'nest-boundary';
    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="title"',
      '',
      'NestJS Multipart',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="upload.txt"',
      'Content-Type: text/plain',
      '',
      'Uploaded file content',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const req = createMockReq(multipartHeaders(boundary));

    expect(
      await run(new MultipartNestjs(), req, [Buffer.from(bodyParts)]),
    ).toBeUndefined();
    expect(req.fields.title).toBe('NestJS Multipart');
    expect(req.files.file.name).toBe('upload.txt');
    expect(req.files.file.buffer.toString()).toBe('Uploaded file content');
    expect(req.body.title).toBe('NestJS Multipart');
  });

  it('should handle duplicate fields and duplicate files', async () => {
    const boundary = 'nest-duplicates';
    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="tag"',
      '',
      'nest',
      `--${boundary}`,
      'Content-Disposition: form-data; name="tag"',
      '',
      'express',
      `--${boundary}`,
      'Content-Disposition: form-data; name="docs"; filename="d1.txt"',
      'Content-Type: text/plain',
      '',
      'one',
      `--${boundary}`,
      'Content-Disposition: form-data; name="docs"; filename="d2.txt"',
      'Content-Type: text/plain',
      '',
      'two',
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const req = createMockReq(multipartHeaders(boundary));

    await run(new MultipartNestjs(), req, [Buffer.from(bodyParts)]);

    expect(req.fields.tag).toEqual(['nest', 'express']);
    expect(req.files.docs).toHaveLength(2);
  });

  it('should pass a 413 HttpException when the body is too large', async () => {
    const err = await run(
      new MultipartNestjs({ maxSize: 10 }),
      createMockReq(multipartHeaders('l')),
      [Buffer.alloc(30)],
    );

    expect(err.getStatus()).toBe(413);
    expect(err.message).toContain('Request body exceeds size limit');
  });

  it('should pass a 413 HttpException when a file is too large', async () => {
    const boundary = 'nest-file';
    const err = await run(
      new MultipartNestjs({ fileSize: 1 }),
      createMockReq(multipartHeaders(boundary)),
      [fileBody(boundary)],
    );

    expect(err.getStatus()).toBe(413);
    expect(err.getResponse()).toMatchObject({ error: 'LIMIT_FILE_SIZE' });
  });

  it('should pass a 415 HttpException for a disallowed MIME type', async () => {
    const boundary = 'nest-mime';
    const err = await run(
      new MultipartNestjs({ allowedMimeTypes: ['image/*'] }),
      createMockReq(multipartHeaders(boundary)),
      [fileBody(boundary, 'application/x-msdownload')],
    );

    expect(err.getStatus()).toBe(415);
  });

  it('should wrap unexpected errors in a 400 HttpException', async () => {
    const req = createMockReq(multipartHeaders('test'));
    req.on = vi.fn().mockImplementation(() => {
      throw new Error('Attach failed');
    });
    const next = vi.fn();

    await new MultipartNestjs().use(req, createMockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(400);
    expect(err.message).toBe('Attach failed');
  });

  it('createMultipartNestjs should bake options into a class Nest can instantiate', async () => {
    const Configured = createMultipartNestjs({ maxSize: 10 });
    const err = await run(new Configured(), createMockReq(multipartHeaders('c')), [
      Buffer.alloc(30),
    ]);

    expect(err.getStatus()).toBe(413);
  });

  it('multipartNestjs should work as functional middleware', async () => {
    const boundary = 'fn';
    const req = createMockReq(multipartHeaders(boundary));
    const middleware = multipartNestjs();
    const next = vi.fn();

    const promise = middleware(req, createMockRes(), next);
    req.emit(
      'data',
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="a"\r\n\r\n1\r\n--${boundary}--\r\n`,
      ),
    );
    req.emit('end');
    await promise;

    expect(next).toHaveBeenCalledWith();
    expect(req.fields.a).toBe('1');
  });
});
