/**
 * Middleware exports - Optional framework-specific imports
 *
 * Export only the types and core parser
 * Framework-specific middleware can be imported from:
 * - @xkid1/multipart/middleware/express
 * - @xkid1/multipart/middleware/nestjs
 */

// Core types and utilities
export type * from './core/types';
export { parseMultipartWithDuplicates } from './core/parse-multipart';
