/**
 * Framework-agnostic middleware exports.
 *
 * The Express middleware is re-exported here because it has no runtime dependency
 * on Express. The NestJS middleware imports `@nestjs/common` at runtime, so it is
 * only available from `@xkid1/multipart/middleware/nestjs`.
 */

export { parseMultipartWithDuplicates } from '@libs';
export * from './express';
export { parseMultipartRequest, toMiddlewareError } from './shared/parse-request';
export { readRequestBody, type RequestLike } from './shared/read-request-body';
