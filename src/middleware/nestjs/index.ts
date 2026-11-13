import { BadRequestException } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { parseMultipartWithDuplicates } from '../core/parse-multipart';
import type { MiddlewareError, MiddlewareOptions } from '../core/types';

/**
 * NestJS multipart middleware for handling file uploads
 *
 * @example
 * ```typescript
 * import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
 * import { MultipartMiddleware } from '@xkid1/multipart/middleware/nestjs';
 * import { UploadController } from './upload.controller';
 *
 * @Module({
 *   controllers: [UploadController],
 * })
 * export class UploadModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(new MultipartMiddleware())
 *       .forRoutes('/upload');
 *   }
 * }
 * ```
 */
export class MultipartMiddleware implements NestMiddleware {
  constructor(private readonly options: MiddlewareOptions = {}) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Only process multipart/form-data requests
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return next();
    }

    // Extract boundary from content-type header
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      throw new BadRequestException('No boundary found in Content-Type header');
    }

    const boundary = boundaryMatch[1].replace(/"/g, '');

    try {
      // Collect the request body
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxSize = this.options.maxSize || 104857600; // 100MB default

      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          req.pause();
          throw new BadRequestException(
            `Request body exceeds size limit of ${maxSize} bytes`,
          );
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks);

        try {
          // Parse multipart data
          const data = parseMultipartWithDuplicates(body, boundary, this.options);

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
          throw new BadRequestException(err.message);
        }
      });

      req.on('error', (error) => {
        throw new BadRequestException(error.message);
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      throw new BadRequestException(err.message);
    }
  }
}
