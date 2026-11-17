/**
 * Request properties added by the Express and NestJS middleware.
 * @module @xkid1/multipart/types/middleware
 */

import type { FileData } from '../file-data/file-data';
import type { MiddlewareError, ParsedFormData } from './core';

/** Properties the middleware attaches to the request. */
export interface MultipartRequestProperties {
  /** Uploaded files, keyed by field name. An array when the name repeats. */
  files?: Record<string, FileData | FileData[]>;
  /** Text fields, keyed by field name. An array when the name repeats. */
  fields?: Record<string, string | string[]>;
  /** Set instead of calling `next(err)` when `onError` is `'attach'` (the default). */
  multipartError?: MiddlewareError;
}

declare global {
  // Augment Express's Request so `req.files` etc. are typed without casts.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Request extends MultipartRequestProperties {}
  }
}

/** A parsed multipart request: the full body plus files and fields split apart. */
export interface ParsedMultipartRequest {
  body: ParsedFormData;
  files: Record<string, FileData | FileData[]>;
  fields: Record<string, string | string[]>;
}
