import { limitError } from '@libs';
import { MultiPartError, MultiPartErrorCode } from '@utils';

/**
 * The parts of a Node.js request (`http.IncomingMessage`) the middleware uses.
 * Express and NestJS (Express platform) requests both satisfy it.
 */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  /** If another middleware already buffered the raw body, it is reused. */
  body?: unknown;
  readableEnded?: boolean;
  on(event: string, listener: (...args: any[]) => void): unknown;
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
  resume?(): unknown;
}

/**
 * Read a request body into a single Buffer, enforcing `maxSize` while streaming.
 *
 * - Rejects with a 413 {@link MultiPartError} as soon as `maxSize` is exceeded,
 *   then drains the remaining input so a response can still be sent.
 * - Rejects if the stream errors or the client disconnects before `end`.
 * - Removes its listeners once settled (keeping a no-op `error` listener, so a
 *   late stream error can't crash the process).
 * - Reuses `req.body` if it is already a Buffer (e.g. `express.raw()`), and
 *   rejects if the stream was consumed by something else.
 */
export const readRequestBody = (req: RequestLike, maxSize: number): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) {
    return req.body.byteLength > maxSize
      ? Promise.reject(
          limitError(
            MultiPartErrorCode.LIMIT_BODY_SIZE,
            `Request body exceeds size limit of ${maxSize} bytes`,
            req.body.byteLength,
            maxSize,
          ),
        )
      : Promise.resolve(req.body);
  }

  if (req.readableEnded) {
    return Promise.reject(
      new MultiPartError(
        'Request body was already consumed by another middleware',
        MultiPartErrorCode.BODY_ALREADY_CONSUMED,
        { statusCode: 500 },
      ),
    );
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let settled = false;

    // The 'error' listener stays attached (as a no-op once settled): a stream
    // error with no listener would otherwise crash the process.
    const cleanup = (): void => {
      settled = true;
      req.removeListener('data', onData);
      req.removeListener('end', onEnd);
      req.removeListener('close', onClose);
    };

    const fail = (error: MultiPartError): void => {
      cleanup();
      chunks.length = 0;
      reject(error);
    };

    function onData(chunk: Buffer): void {
      received += chunk.length;
      if (received <= maxSize) {
        chunks.push(chunk);
        return;
      }
      fail(
        limitError(
          MultiPartErrorCode.LIMIT_BODY_SIZE,
          `Request body exceeds size limit of ${maxSize} bytes`,
          received,
          maxSize,
        ),
      );
      // Keep the stream flowing (and discard it) so the client can receive the 413.
      req.resume?.();
    }

    function onEnd(): void {
      cleanup();
      resolve(Buffer.concat(chunks, received));
    }

    function onError(error: Error): void {
      if (settled) return;
      fail(
        new MultiPartError(error.message, MultiPartErrorCode.REQUEST_ERROR, {
          statusCode: 400,
          cause: error,
        }),
      );
    }

    function onClose(): void {
      fail(
        new MultiPartError(
          'Request closed before the body was fully received',
          MultiPartErrorCode.REQUEST_ERROR,
          { statusCode: 400 },
        ),
      );
    }

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
    req.on('close', onClose);
  });
};
