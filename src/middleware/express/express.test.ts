import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import {
  getFile,
  getField,
  hasFiles,
  multipartErrorHandler,
  multipartExpress,
} from './index';

describe('express middleware', () => {
  const createMockReq = (headers: Record<string, string | string[]> = {}) => {
    const emitter = new EventEmitter() as any;
    emitter.headers = headers;
    emitter.method = 'POST';
    emitter.pause = vi.fn();
    return emitter;
  };

  const createMockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it('should ignore requests without multipart/form-data content type', async () => {
    const req = createMockReq({ 'content-type': 'application/json' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.files).toBeUndefined();
  });

  it('should set NO_BOUNDARY error when boundary is missing', async () => {
    const req = createMockReq({ 'content-type': 'multipart/form-data' });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'NO_BOUNDARY' });
  });

  it('should successfully parse multipart body with fields and files', async () => {
    const boundary = 'express-boundary';
    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="username"',
      '',
      'alice',
      `--${boundary}`,
      'Content-Disposition: form-data; name="avatar"; filename="avatar.png"',
      'Content-Type: image/png',
      '',
      'fake-png-data',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress();
    const promise = middleware(req, res, next);

    req.emit('data', Buffer.from(bodyParts));
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.fields.username).toBe('alice');
    expect(req.files.avatar).toBeDefined();
    expect(req.files.avatar.name).toBe('avatar.png');
    expect(hasFiles(req)).toBe(true);
    expect(hasFiles(req, 'avatar')).toBe(true);
    expect(hasFiles(req, 'nonexistent')).toBe(false);
    expect(getFile(req, 'avatar')).toBeDefined();
    expect(getField(req, 'username')).toBe('alice');
    expect(getFile(req, 'nonexistent')).toBeNull();
    expect(getField(req, 'nonexistent')).toBeNull();
  });

  it('should handle duplicate fields and duplicate files as arrays', async () => {
    const boundary = 'express-duplicates';
    const bodyParts = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="tag"',
      '',
      'node',
      `--${boundary}`,
      'Content-Disposition: form-data; name="tag"',
      '',
      'typescript',
      `--${boundary}`,
      'Content-Disposition: form-data; name="docs"; filename="doc1.txt"',
      'Content-Type: text/plain',
      '',
      'content 1',
      `--${boundary}`,
      'Content-Disposition: form-data; name="docs"; filename="doc2.txt"',
      'Content-Type: text/plain',
      '',
      'content 2',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress();
    const promise = middleware(req, res, next);

    req.emit('data', Buffer.from(bodyParts));
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.fields.tag).toEqual(['node', 'typescript']);
    expect(Array.isArray(req.files.docs)).toBe(true);
    expect(req.files.docs).toHaveLength(2);
  });

  it('should enforce maxSize limit', async () => {
    const boundary = 'limit-boundary';
    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress({ maxSize: 10 });
    const promise = middleware(req, res, next);

    req.emit('data', Buffer.alloc(20));
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'SIZE_LIMIT_EXCEEDED' });
  });

  it('should handle request stream error', async () => {
    const boundary = 'error-boundary';
    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress();
    const promise = middleware(req, res, next);

    req.emit('error', new Error('Stream failed'));

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'REQUEST_ERROR' });
  });

  it('should handle multipart parsing errors in end event', async () => {
    const boundary = 'malformed-boundary';
    const body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="f"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nTOOBIG\r\n--${boundary}--\r\n`,
    );
    const req = createMockReq({
      'content-type': `multipart/form-data; boundary=${boundary}`,
    });
    const res = createMockRes();
    const next = vi.fn();

    // Set fileSize smaller than body so parseMultipartWithDuplicates throws inside req.on('end')
    const middleware = multipartExpress({ fileSize: 1 });
    const promise = middleware(req, res, next);
    req.emit('data', body);
    req.emit('end');

    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'PARSE_ERROR' });
  });

  it('should handle initialization errors', async () => {
    const req = createMockReq({
      'content-type': 'multipart/form-data; boundary=test',
    });
    req.on = vi.fn().mockImplementation(() => {
      throw new Error('Listener failure');
    });
    const res = createMockRes();
    const next = vi.fn();

    const middleware = multipartExpress();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'INIT_ERROR' });
  });

  describe('multipartErrorHandler', () => {
    it('should respond with multipartError status and json if error exists', () => {
      const req = createMockReq();
      req.multipartError = { statusCode: 400, message: 'Invalid boundary' };
      const res = createMockRes();
      const next = vi.fn();

      multipartErrorHandler(new Error(), req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward to next error handler if no multipartError', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = vi.fn();
      const err = new Error('Generic error');

      multipartErrorHandler(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
