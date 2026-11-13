/**
 * NESTJS MIDDLEWARE EXAMPLES
 * ==========================
 *
 * Complete examples of using @xkid1/multipart as middleware in NestJS
 */

import {
  Controller,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { MultipartMiddleware } from '@xkid1/multipart/middleware/nestjs';

/**
 * EXAMPLE 1: Basic NestJS Module with Multipart Middleware
 */

@Controller('upload')
export class UploadController {
  @Post('single')
  uploadSingle(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({
        error: req.multipartError.message,
      });
    }

    const files = req.files || {};
    const fields = req.fields || {};

    if (Object.keys(files).length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      files,
      fields,
    });
  }

  @Post('multiple')
  uploadMultiple(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({
        error: req.multipartError.message,
      });
    }

    const files = req.files || {};
    const fileList = [];

    for (const [fieldName, fileData] of Object.entries(files)) {
      if (Array.isArray(fileData)) {
        fileList.push(
          ...fileData.map((f: any) => ({
            fieldName,
            name: f.name,
            size: f.size,
            mimeType: f.mimeType,
          })),
        );
      } else {
        fileList.push({
          fieldName,
          name: (fileData as any).name,
          size: (fileData as any).size,
          mimeType: (fileData as any).mimeType,
        });
      }
    }

    res.json({
      success: true,
      count: fileList.length,
      files: fileList,
    });
  }
}

@Module({
  controllers: [UploadController],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(new MultipartMiddleware()).forRoutes(UploadController);
  }
}

/**
 * EXAMPLE 2: With Configuration Options
 */

@Controller('upload-advanced')
export class UploadAdvancedController {
  @Post('with-limits')
  uploadWithLimits(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({
        error: req.multipartError.message,
        code: req.multipartError.code,
      });
    }

    const files = req.files || {};
    const fields = req.fields || {};

    res.json({
      success: true,
      uploadedFiles: Object.keys(files).length,
      formFields: Object.keys(fields).length,
      data: {
        files,
        fields,
      },
    });
  }
}

@Module({
  controllers: [UploadAdvancedController],
})
export class UploadAdvancedModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        new MultipartMiddleware({
          maxSize: 500 * 1024 * 1024, // 500MB
          maxFiles: 20,
          maxFields: 50,
          fileSize: 100 * 1024 * 1024, // 100MB per file
          fieldSize: 10 * 1024 * 1024, // 10MB per field
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
          debug: true,
        }),
      )
      .forRoutes(UploadAdvancedController);
  }
}

/**
 * EXAMPLE 3: Production Grade Implementation with Validation
 */

@Controller('api/upload')
export class ApiUploadController {
  @Post()
  uploadFiles(@Req() req: any, @Res() res: Response) {
    // Check for parsing errors
    if (req.multipartError) {
      const error = req.multipartError;
      console.error(`[Upload Error] ${error.code}: ${error.message}`);

      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    try {
      const files = req.files || {};
      const fields = req.fields || {};

      // Validate required fields
      if (!fields.userId) {
        return res.status(400).json({
          success: false,
          error: 'userId field is required',
        });
      }

      if (!fields.title) {
        return res.status(400).json({
          success: false,
          error: 'title field is required',
        });
      }

      // Validate at least one file
      if (Object.keys(files).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one file is required',
        });
      }

      // Process and validate files
      const uploadedFiles = [];
      const fileErrors = [];

      for (const [fieldName, fileData] of Object.entries(files)) {
        const fileArray = Array.isArray(fileData) ? fileData : [fileData];

        for (const file of fileArray as any[]) {
          // Additional validation can be done here
          if (file.size === 0) {
            fileErrors.push({
              name: file.name,
              error: 'File is empty',
            });
          } else {
            uploadedFiles.push({
              fieldName,
              name: file.name,
              size: file.size,
              mimeType: file.mimeType,
              extension: file.extension,
              encoding: file.encoding,
            });
          }
        }
      }

      // Return results
      res.json({
        success: true,
        message: 'Files uploaded successfully',
        metadata: {
          userId: fields.userId,
          title: fields.title,
          description: fields.description || null,
          tags: fields.tags || [],
        },
        uploadedFiles,
        errors: fileErrors.length > 0 ? fileErrors : null,
        summary: {
          totalFiles: uploadedFiles.length,
          totalSize: uploadedFiles.reduce((sum: number, f: any) => sum + f.size, 0),
          errorCount: fileErrors.length,
        },
      });
    } catch (error) {
      console.error('Upload handler error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process upload',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

@Module({
  controllers: [ApiUploadController],
})
export class ApiUploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        new MultipartMiddleware({
          maxSize: 1024 * 1024 * 1024, // 1GB
          maxFiles: 100,
          maxFields: 200,
          fileSize: 500 * 1024 * 1024, // 500MB per file
          fieldSize: 50 * 1024 * 1024, // 50MB per field
          allowedMimeTypes: [
            'image/*',
            'application/pdf',
            'application/msword',
            'text/plain',
            'application/json',
          ],
          debug: process.env.NODE_ENV === 'development',
        }),
      )
      .forRoutes('api/upload');
  }
}

/**
 * EXAMPLE 4: Multiple Upload Endpoints
 */

@Controller('api/files')
export class FileController {
  @Post('avatar')
  uploadAvatar(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({
        error: req.multipartError.message,
      });
    }

    const file = req.files?.avatar;
    if (!file) {
      return res.status(400).json({ error: 'Avatar file required' });
    }

    res.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      },
    });
  }

  @Post('documents')
  uploadDocuments(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({
        error: req.multipartError.message,
      });
    }

    const files = req.files?.documents || [];
    const fileList = Array.isArray(files) ? files : [files];

    res.json({
      success: true,
      count: fileList.length,
      files: fileList.map((f: any) => ({
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
      })),
    });
  }

  @Post('batch')
  uploadBatch(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({
        error: req.multipartError.message,
      });
    }

    const files = req.files || {};
    const fields = req.fields || {};

    res.json({
      success: true,
      fileGroups: Object.entries(files).map(([key, value]) => ({
        fieldName: key,
        files: Array.isArray(value) ? value.length : 1,
      })),
      metadata: fields,
    });
  }
}

@Module({
  controllers: [FileController],
})
export class FileModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        new MultipartMiddleware({
          maxFiles: 50,
          fileSize: 100 * 1024 * 1024, // 100MB per file
          allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
        }),
      )
      .forRoutes('api/files');
  }
}

/**
 * EXAMPLE 5: Global App Configuration
 */

import { NestFactory } from '@nestjs/core';

async function bootstrapWithMultipartMiddleware() {
  const app = await NestFactory.create(ApiUploadModule);

  // Register multipart middleware globally for all routes
  app.use(
    new MultipartMiddleware({
      maxSize: 500 * 1024 * 1024, // 500MB
      maxFiles: 50,
      maxFields: 100,
      fileSize: 100 * 1024 * 1024, // 100MB per file
      debug: false,
    }),
  );

  await app.listen(3000);
}

export { bootstrapWithMultipartMiddleware };
