import { HttpException } from '@nestjs/common';

import { parseMultipartRequest, toMiddlewareError } from '../shared/parse-request';

import type { RequestLike } from '../shared/read-request-body';
import type { NestMiddleware, Type } from '@nestjs/common';
import type { MiddlewareOptions, MultipartRequestProperties } from '@types';

type NestRequest = RequestLike & MultipartRequestProperties;
type NestNext = (error?: unknown) => void;

/**
 * Convert a parse failure into a Nest `HttpException` with the matching status
 * (400, 413, 415, ...). The response body is
 * `{ statusCode, message, error: <MultiPartErrorCode> }`.
 */
export const toNestException = (error: unknown): HttpException => {
  const { code, message, statusCode } = toMiddlewareError(error);
  return new HttpException({ statusCode, message, error: code }, statusCode, {
    cause: error,
  });
};

/**
 * NestJS multipart/form-data middleware (Express platform).
 *
 * On success, sets `req.body`, `req.files` and `req.fields`. On failure, calls
 * `next()` with an `HttpException`, so Nest's exception filters respond.
 *
 * @example
 * ```typescript
 * import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
 * import { MultipartNestjs, createMultipartNestjs } from '@xkid1/multipart/middleware/nestjs';
 *
 * @Module({ controllers: [UploadController] })
 * export class UploadModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     // Default limits:
 *     consumer.apply(MultipartNestjs).forRoutes('upload');
 *     // Custom options:
 *     consumer.apply(createMultipartNestjs({ maxFiles: 5 })).forRoutes('avatar');
 *   }
 * }
 * ```
 */
export class MultipartNestjs implements NestMiddleware {
  constructor(private readonly options: MiddlewareOptions = {}) {}

  use(req: NestRequest, _res: unknown, next: NestNext): Promise<void> {
    return parseMultipartRequest(req, this.options).then(
      (parsed) => {
        if (parsed) {
          req.body = parsed.body;
          req.files = parsed.files;
          req.fields = parsed.fields;
        }
        next();
      },
      (error: unknown) => {
        next(toNestException(error));
      },
    );
  }
}

/**
 * Create a middleware class with options built in, for
 * `consumer.apply(createMultipartNestjs({ ... }))`. Nest instantiates middleware
 * classes itself, so options can't be passed to the constructor directly.
 */
export const createMultipartNestjs = (options: MiddlewareOptions): Type<NestMiddleware> =>
  class ConfiguredMultipartNestjs extends MultipartNestjs {
    constructor() {
      super(options);
    }
  };

/**
 * Functional form of the middleware, for `consumer.apply(multipartNestjs({ ... }))`
 * or `app.use(multipartNestjs())`.
 */
export const multipartNestjs = (options: MiddlewareOptions = {}) => {
  const middleware = new MultipartNestjs(options);
  return (req: NestRequest, res: unknown, next: NestNext): Promise<void> =>
    middleware.use(req, res, next);
};

export default MultipartNestjs;

export type {
  FileData,
  MiddlewareError,
  MiddlewareOptions,
  MultipartRequestProperties,
} from '@types';
