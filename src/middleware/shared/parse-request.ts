import {
  extractBoundary,
  firstHeaderValue,
  isMultipartFormData,
  parseMultipartWithDuplicates,
  resolveLimits,
  splitFormData,
} from '@libs';
import { MultiPartError, MultiPartErrorCode } from '@utils';

import { readRequestBody, type RequestLike } from './read-request-body';

import type { MiddlewareError, MiddlewareOptions, ParsedMultipartRequest } from '@types';

/**
 * Read and parse a multipart/form-data request. Framework-agnostic: the Express
 * and NestJS middleware differ only in how they report the result.
 *
 * Note: this is `async`, but the body listeners are attached synchronously on
 * the first call, so no stream data is missed.
 *
 * @returns The parsed request, or `null` if it is not multipart/form-data
 * @throws {MultiPartError} With `code` and `statusCode` describing the failure
 */
export const parseMultipartRequest = async (
  req: RequestLike,
  options: MiddlewareOptions = {},
): Promise<ParsedMultipartRequest | null> => {
  const contentType = firstHeaderValue(req.headers['content-type']);
  if (!isMultipartFormData(contentType)) return null;

  const boundary = extractBoundary(contentType);
  if (!boundary) {
    throw new MultiPartError(
      'No boundary found in Content-Type header',
      MultiPartErrorCode.NO_BOUNDARY,
      { statusCode: 400 },
    );
  }

  const raw = await readRequestBody(req, resolveLimits(options).maxSize);
  const body = parseMultipartWithDuplicates(raw, boundary, options);
  return { body, ...splitFormData(body) };
};

/** Convert any thrown value into the serializable {@link MiddlewareError} shape. */
export const toMiddlewareError = (error: unknown): MiddlewareError => {
  if (error instanceof MultiPartError) {
    return {
      code: error.code ?? 'PARSE_ERROR',
      message: error.message,
      statusCode: error.statusCode ?? 400,
      ...(error.size !== undefined && { size: error.size }),
      ...(error.limit !== undefined && { limit: error.limit }),
    };
  }
  return {
    code: 'PARSE_ERROR',
    message: error instanceof Error ? error.message : String(error),
    statusCode: 400,
  };
};
