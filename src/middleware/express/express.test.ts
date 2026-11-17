import { EventEmitter } from 'node:events';

import { describe, expect, it, vi } from 'vitest';

import { MultiPartError } from '@utils';

import {
  getField,
  getFile,
  hasFiles,
  multipartErrorHandler,
  multipartExpress,
} from './index';

describe('express middleware', () => {
  const createMockReq = (headers: Record<string, string | string[]> = {}): any => {
    const emitter = new EventEmitter() as any;
    emitter.headers = headers;
    emitter.method = 'POST';
    emitter.resume = vi.fn();
    return emitter;
  };

  const createMockRes = (): any => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const multipartHeaders = (boundary: string) => ({
    'content-type': `multipart/form-data; boundary=${boundary}`,
  });

  const fileTooBigBody = (boundary: string) =>
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="f"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nTOOBIG\r\n--${boundary}--\r\n`,
    );

  it('should ignore requests without multipart/form-data content type', async () => {
    const req = createMockReq({ 'content-type': 'application/json' });
    const next = vi.fn();

    await multipartExpress()(req, createMockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.files).toBeUndefined();
  });

  it('should set NO_BOUNDARY error when boundary is missing', async () => {
    const req = createMockReq({ 'content-type': 'multipart/form-data' });
    const next = vi.fn();

    await multipartExpress()(req, createMockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'NO_BOUNDARY', statusCode: 400 });
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

    const req = createMockReq(multipartHeaders(boundary));
    const next = vi.fn();

    const promise = multipartExpress()(req, createMockRes(), next);
    req.emit('data', Buffer.from(bodyParts));
    req.emit('end');
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.fields.username).toBe('alice');
    expect(req.files.avatar.name).toBe('avatar.png');
    expect(req.files.avatar.buffer.toString()).toBe('fake-png-data');
    expect(req.body.username).toBe('alice');
    expect(hasFiles(req)).toBe(true);
    expect(hasFiles(req, 'avatar')).toBe(true);
    expect(hasFiles(req, 'nonexistent')).toBe(false);
    expect(getFile(req, 'avatar')).toBeDefined();
    expect(getField(req, 'username')).toBe('alice');
    expect(getFile(req, 'nonexistent')).toBeNull();
    expect(getField(req, 'nonexistent')).toBeNull();
  });

  it('should accept a quoted boundary and mixed-case content type', async () => {
    const boundary = 'quoted boundary';
    const req = createMockReq({
      'content-type': `Multipart/Form-Data; boundary="${boundary}"`,
    });
    const next = vi.fn();

    const promise = multipartExpress()(req, createMockRes(), next);
    req.emit(
      'data',
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="a"\r\n\r\n1\r\n--${boundary}--\r\n`,
      ),
    );
    req.emit('end');
    await promise;

    expect(req.fields.a).toBe('1');
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

    const req = createMockReq(multipartHeaders(boundary));
    const next = vi.fn();

    const promise = multipartExpress()(req, createMockRes(), next);
    req.emit('data', Buffer.from(bodyParts));
    req.emit('end');
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.fields.tag).toEqual(['node', 'typescript']);
    expect(req.files.docs).toHaveLength(2);
  });

  it('should enforce maxSize while streaming and drain the rest', async () => {
    const req = createMockReq(multipartHeaders('limit-boundary'));
    const next = vi.fn();

    const promise = multipartExpress({ maxSize: 10 })(req, createMockRes(), next);
    req.emit('data', Buffer.alloc(20));
    req.emit('end');
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({
      code: 'LIMIT_BODY_SIZE',
      statusCode: 413,
      size: 20,
      limit: 10,
    });
    expect(req.resume).toHaveBeenCalled();
    expect(req.listenerCount('data')).toBe(0);
  });

  it('should honour maxSize: 0 instead of falling back to the default', async () => {
    const req = createMockReq(multipartHeaders('zero'));
    const next = vi.fn();

    const promise = multipartExpress({ maxSize: 0 })(req, createMockRes(), next);
    req.emit('data', Buffer.alloc(1));
    await promise;

    expect(req.multipartError).toMatchObject({ code: 'LIMIT_BODY_SIZE' });
  });

  it('should handle request stream error', async () => {
    const req = createMockReq(multipartHeaders('error-boundary'));
    const next = vi.fn();

    const promise = multipartExpress()(req, createMockRes(), next);
    req.emit('error', new Error('Stream failed'));
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({
      code: 'REQUEST_ERROR',
      message: 'Stream failed',
    });
  });

  it('should fail instead of hanging when the client disconnects', async () => {
    const req = createMockReq(multipartHeaders('abort'));
    const next = vi.fn();

    const promise = multipartExpress()(req, createMockRes(), next);
    req.emit('data', Buffer.from('--abort\r\n'));
    req.emit('close');
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({ code: 'REQUEST_ERROR' });
  });

  it('should call next exactly once and remove listeners after success', async () => {
    const req = createMockReq(multipartHeaders('once'));
    const next = vi.fn();

    const promise = multipartExpress()(req, createMockRes(), next);
    req.emit('end');
    req.emit('close');
    req.emit('error', new Error('late error'));
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toBeUndefined();
    for (const event of ['data', 'end', 'close'])
      expect(req.listenerCount(event)).toBe(0);
  });

  it('should reuse a body that was already buffered, e.g. by express.raw()', async () => {
    const boundary = 'raw';
    const req = createMockReq(multipartHeaders(boundary));
    req.body = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="a"\r\n\r\nraw\r\n--${boundary}--\r\n`,
    );
    const next = vi.fn();

    await multipartExpress()(req, createMockRes(), next);

    expect(req.fields.a).toBe('raw');
  });

  it('should report an already-consumed stream instead of hanging', async () => {
    const req = createMockReq(multipartHeaders('consumed'));
    req.readableEnded = true;
    const next = vi.fn();

    await multipartExpress()(req, createMockRes(), next);

    expect(req.multipartError).toMatchObject({
      code: 'BODY_ALREADY_CONSUMED',
      statusCode: 500,
    });
  });

  it('should report parser limit errors with their code and 413 status', async () => {
    const boundary = 'malformed-boundary';
    const req = createMockReq(multipartHeaders(boundary));
    const next = vi.fn();

    const promise = multipartExpress({ fileSize: 1 })(req, createMockRes(), next);
    req.emit('data', fileTooBigBody(boundary));
    req.emit('end');
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({
      code: 'LIMIT_FILE_SIZE',
      statusCode: 413,
    });
  });

  it('should report unexpected errors as PARSE_ERROR', async () => {
    const req = createMockReq(multipartHeaders('test'));
    req.on = vi.fn().mockImplementation(() => {
      throw new Error('Listener failure');
    });
    const next = vi.fn();

    await multipartExpress()(req, createMockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.multipartError).toMatchObject({
      code: 'PARSE_ERROR',
      message: 'Listener failure',
    });
  });

  it("should pass the error to next() with onError: 'next'", async () => {
    const boundary = 'next-mode';
    const req = createMockReq(multipartHeaders(boundary));
    const next = vi.fn();

    const promise = multipartExpress({ fileSize: 1, onError: 'next' })(
      req,
      createMockRes(),
      next,
    );
    req.emit('data', fileTooBigBody(boundary));
    req.emit('end');
    await promise;

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(MultiPartError);
    expect(error).toMatchObject({ code: 'LIMIT_FILE_SIZE', statusCode: 413 });
    expect(req.multipartError).toBeUndefined();
  });

  describe('multipartErrorHandler', () => {
    it('should respond with multipartError status and json if error exists', () => {
      const req = createMockReq();
      req.multipartError = {
        code: 'NO_BOUNDARY',
        statusCode: 400,
        message: 'Invalid boundary',
      };
      const res = createMockRes();
      const next = vi.fn();

      multipartErrorHandler(new Error(), req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: req.multipartError });
      expect(next).not.toHaveBeenCalled();
    });

    it('should respond to a MultiPartError passed via next(err)', () => {
      const res = createMockRes();
      const next = vi.fn();
      const err = new MultiPartError('too many', 'LIMIT_FILES', { statusCode: 413 });

      multipartErrorHandler(err, createMockReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'LIMIT_FILES', message: 'too many', statusCode: 413 },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward to next error handler if no multipartError', () => {
      const next = vi.fn();
      const err = new Error('Generic error');

      multipartErrorHandler(err, createMockReq(), createMockRes(), next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
