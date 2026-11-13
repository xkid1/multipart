import type { NextFunction, Request, Response } from 'express';

import { parseMultipartWithDuplicates } from '../core/parse-multipart';
import type { MiddlewareError, MiddlewareOptions } from '../core/types';

/**
 * Express multipart middleware factory
 *
 * @param options - Middleware configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { multipartMiddleware } from '@xkid1/multipart/middleware/express';
 *
 * const app = express();
 *
 * // Basic usage
 * app.post('/upload', multipartMiddleware(), (req, res) => {
 *   console.log(req.files);  // File data
 *   console.log(req.fields); // Text fields
 *   res.json({ success: true });
 * });
 *
 * // With options
 * app.post('/upload', multipartMiddleware({
 *   maxSize: 500 * 1024 * 1024,    // 500MB
 *   maxFiles: 10,
 *   allowedMimeTypes: ['image/jpeg', 'image/png'],
 *   fileSize: 100 * 1024 * 1024,   // 100MB per file
 * }), (req, res) => {
 *   if (req.multipartError) {
 *     return res.status(400).json({ error: req.multipartError });
 *   }
 *   res.json({ files: req.files, fields: req.fields });
 * });
 * ```
 */
export const multipartMiddleware = (options: MiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only process multipart/form-data requests
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return next();
    }

    // Extract boundary from content-type header
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      const error: MiddlewareError = {
        code: 'NO_BOUNDARY',
        message: 'No boundary found in Content-Type header',
        statusCode: 400,
      };
      (req as any).multipartError = error;
      return next();
    }

    const boundary = boundaryMatch[1].replace(/"/g, '');

    try {
      // Collect the request body
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = options.maxSize || 104857600; // 100MB default

      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          req.pause();
          const error: MiddlewareError = {
            code: 'SIZE_LIMIT_EXCEEDED',
            message: `Request body exceeds size limit of ${maxSize} bytes`,
            statusCode: 413,
            size: totalSize,
            limit: maxSize,
          };
          (req as any).multipartError = error;
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks);

        try {
          // Parse multipart data
          const data = parseMultipartWithDuplicates(body, boundary, options);

          // Separate files and fields
          const files: Record<string, any> = {};
          const fields: Record<string, any> = {};

          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              // Check if it's an array of FileData or strings
              if (
                value.length > 0 &&
                typeof value[0] === 'object' &&
                'buffer' in value[0]
              ) {
                files[key] = value;
              } else {
                fields[key] = value;
              }
            } else if (typeof value === 'object' && 'buffer' in value) {
              files[key] = value;
            } else {
              fields[key] = value;
            }
          }

          // Attach to request object
          (req as any).files = files;
          (req as any).fields = fields;
          (req as any).body = data;

          next();
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          const middlewareError: MiddlewareError = {
            code: 'PARSE_ERROR',
            message: err.message,
            statusCode: 400,
          };
          (req as any).multipartError = middlewareError;
          next();
        }
      });

      req.on('error', (error) => {
        const middlewareError: MiddlewareError = {
          code: 'REQUEST_ERROR',
          message: error.message,
          statusCode: 500,
        };
        (req as any).multipartError = middlewareError;
        next();
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const middlewareError: MiddlewareError = {
        code: 'INIT_ERROR',
        message: err.message,
        statusCode: 500,
      };
      (req as any).multipartError = middlewareError;
      next();
    }
  };
};

/**
 * Error handler middleware for multipart errors
 *
 * @example
 * ```typescript
 * app.post('/upload', multipartMiddleware(), (req, res) => {
 *   if (req.multipartError) {
 *     return res.status(req.multipartError.statusCode)
 *       .json({ error: req.multipartError.message });
 *   }
 *   res.json({ success: true });
 * });
 * ```
 */
export const multipartErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const multipartError = (req as any).multipartError;
  if (multipartError) {
    res.status(multipartError.statusCode).json({ error: multipartError });
  } else {
    next(err);
  }
};

/**
 * Utility: Check if field contains files
 */
export const hasFiles = (req: Request, fieldName?: string): boolean => {
  const files = (req as any).files;
  if (!files) return false;
  if (!fieldName) return Object.keys(files).length > 0;
  return fieldName in files;
};

/**
 * Utility: Get file(s) from field
 */
export const getFile = (req: Request, fieldName: string) => {
  const files = (req as any).files;
  if (!files || !(fieldName in files)) return null;
  return files[fieldName];
};

/**
 * Utility: Get field value
 */
export const getField = (req: Request, fieldName: string) => {
  const fields = (req as any).fields;
  if (!fields || !(fieldName in fields)) return null;
  return fields[fieldName];
};
