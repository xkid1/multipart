import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/common', () => {
  class BadRequestException extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestException';
    }
  }

  return {
    BadRequestException,
  };
});

import { MultipartNestjs } from './index';

describe('nestjs middleware', () => {
  const createMockReq = (headers: Record<string, string | string[]> = {}) => {
    const emitter = new EventEmitter() as any;
    emitter.headers = headers;
    emitter.method = 'POST';
    emitter.pause = vi.fn();
    return emitter;
  };

  const createMockRes = () => ({}) as any;

  it('should ignore non-multipart requests', async () => {
    const req = createMockReq({ 'content-type': 'application/json' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs();
    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should pass BadRequestException when boundary is missing', async () => {
    const req = createMockReq({ 'content-type': 'multipart/form-data' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs();
    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('No boundary found');
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

    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs();
    const promise = middleware.use(req, res, next);

    req.emit('data', Buffer.from(bodyParts));
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.fields.title).toBe('NestJS Multipart');
    expect(req.files.file.name).toBe('upload.txt');
  });

  it('should handle duplicate fields and duplicate files in nestjs middleware', async () => {
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

    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs();
    const promise = middleware.use(req, res, next);

    req.emit('data', Buffer.from(bodyParts));
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.fields.tag).toEqual(['nest', 'express']);
    expect(Array.isArray(req.files.docs)).toBe(true);
    expect(req.files.docs).toHaveLength(2);
  });

  it('should pass BadRequestException on size exceeded', async () => {
    const boundary = 'nest-limit';
    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs({ maxSize: 10 });
    const promise = middleware.use(req, res, next);

    req.emit('data', Buffer.alloc(30));
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.message).toContain('Request body exceeds size limit');
  });

  it('should pass BadRequestException on parsing error in end event', async () => {
    const boundary = 'nest-malformed';
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="f"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nTOOBIG\r\n--${boundary}--\r\n`,
    );
    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs({ fileSize: 1 });
    const promise = middleware.use(req, res, next);

    req.emit('data', body);
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
  });

  it('should handle init errors in nestjs middleware', async () => {
    const req = createMockReq({
      'content-type': 'multipart/form-data; boundary=test',
    });
    req.on = vi.fn().mockImplementation(() => {
      throw new Error('Attach failed');
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = new MultipartNestjs();
    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.message).toBe('Attach failed');
  });
});
