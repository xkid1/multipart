import { MultiPartError } from '@utils';

import { parseMultipartRequest, toMiddlewareError } from '../shared/parse-request';

import type {
  ExpressMultipartOptions,
  FileData,
  MultipartRequestProperties,
} from '@types';
import type { NextFunction, Request, Response } from 'express';

/**
 * Express multipart/form-data middleware.
 *
 * On success, sets `req.body` (all values), `req.files` and `req.fields`.
 * Requests that aren't multipart/form-data pass through untouched.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { multipartExpress } from '@xkid1/multipart/middleware/express';
 *
 * const app = express();
 *
 * app.post('/upload', multipartExpress({ maxFiles: 5, allowedMimeTypes: ['image/*'] }),
 *   (req, res) => {
 *     if (req.multipartError) {
 *       return res.status(req.multipartError.statusCode).json({ error: req.multipartError });
 *     }
 *     res.json({ files: Object.keys(req.files ?? {}), fields: req.fields });
 *   });
 * ```
 */
export const multipartExpress =
  (options: ExpressMultipartOptions = {}) =>
  (req: Request, _res: Response, next: NextFunction): Promise<void> =>
    parseMultipartRequest(req, options).then(
      (parsed) => {
        if (parsed) {
          req.body = parsed.body;
          req.files = parsed.files;
          req.fields = parsed.fields;
        }
        next();
      },
      (error: unknown) => {
        if (options.onError === 'next') {
          next(error);
          return;
        }
        req.multipartError = toMiddlewareError(error);
        next();
      },
    );

/**
 * Express error handler that responds to multipart errors with their status code
 * and `{ error: MiddlewareError }`, and forwards every other error.
 *
 * Handles both modes: errors attached to `req.multipartError`, and
 * {@link MultiPartError}s passed to `next(err)` with `onError: 'next'`.
 *
 * @example
 * ```typescript
 * app.post('/upload', multipartExpress({ onError: 'next' }), handler);
 * app.use(multipartErrorHandler);
 * ```
 */
export const multipartErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const error =
    req.multipartError ??
    (err instanceof MultiPartError ? toMiddlewareError(err) : undefined);
  if (!error) {
    next(err);
    return;
  }
  res.status(error.statusCode).json({ error });
};

type MultipartRequest = Pick<MultipartRequestProperties, 'files' | 'fields'>;

/** Whether the request has any files, or a file under `fieldName`. */
export const hasFiles = (req: MultipartRequest, fieldName?: string): boolean => {
  if (!req.files) return false;
  return fieldName === undefined
    ? Object.keys(req.files).length > 0
    : fieldName in req.files;
};

/** The file(s) uploaded under `fieldName`, or `null`. */
export const getFile = (
  req: MultipartRequest,
  fieldName: string,
): FileData | FileData[] | null => req.files?.[fieldName] ?? null;

/** The text value(s) of `fieldName`, or `null`. */
export const getField = (
  req: MultipartRequest,
  fieldName: string,
): string | string[] | null => req.fields?.[fieldName] ?? null;

export default multipartExpress;

export type {
  ExpressMultipartOptions,
  FileData,
  MiddlewareError,
  MultipartRequestProperties,
} from '@types';
