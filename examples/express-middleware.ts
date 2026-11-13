/**
 * EXPRESS MIDDLEWARE EXAMPLES
 * ============================
 *
 * Complete examples of using @xkid1/multipart as middleware in Express
 */

import express, { Request, Response } from 'express';

import {
  getFile,
  getField,
  hasFiles,
  multipartErrorHandler,
  multipartMiddleware,
} from '@xkid1/multipart/middleware/express';

/**
 * EXAMPLE 1: Basic file upload with single file
 */
const example1 = () => {
  const app = express();

  // Single file upload
  app.post('/upload/single', multipartMiddleware(), (req: Request, res: Response) => {
    if ((req as any).multipartError) {
      return res
        .status((req as any).multipartError.statusCode)
        .json({ error: (req as any).multipartError });
    }

    const file = getFile(req, 'file');
    const description = getField(req, 'description');

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        extension: file.extension,
        encoding: file.encoding,
      },
      description,
    });
  });

  return app;
};

/**
 * EXAMPLE 2: Multiple files in single field (e.g., files[])
 */
const example2 = () => {
  const app = express();

  // Multiple files with same field name
  app.post('/upload/multiple', multipartMiddleware(), (req: Request, res: Response) => {
    if ((req as any).multipartError) {
      return res
        .status((req as any).multipartError.statusCode)
        .json({ error: (req as any).multipartError });
    }

    const files = getFile(req, 'files');

    if (!files) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Handle both single file and multiple files
    const fileList = Array.isArray(files) ? files : [files];

    res.json({
      success: true,
      count: fileList.length,
      files: fileList.map((f: any) => ({
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        extension: f.extension,
      })),
    });
  });

  return app;
};

/**
 * EXAMPLE 3: Mixed files and form fields
 */
const example3 = () => {
  const app = express();

  app.post(
    '/upload/mixed',
    multipartMiddleware({
      maxFiles: 5,
      fileSize: 10 * 1024 * 1024, // 10MB per file
      allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    }),
    (req: Request, res: Response) => {
      if ((req as any).multipartError) {
        return res
          .status((req as any).multipartError.statusCode)
          .json({ error: (req as any).multipartError });
      }

      const files = (req as any).files || {};
      const fields = (req as any).fields || {};

      res.json({
        success: true,
        fileCount: Object.keys(files).length,
        fieldCount: Object.keys(fields).length,
        files,
        fields,
      });
    },
  );

  return app;
};

/**
 * EXAMPLE 4: Advanced configuration with limits
 */
const example4 = () => {
  const app = express();

  app.post(
    '/upload/advanced',
    multipartMiddleware({
      maxSize: 500 * 1024 * 1024, // 500MB total
      maxFiles: 20,
      maxFields: 100,
      fileSize: 100 * 1024 * 1024, // 100MB per file
      fieldSize: 5 * 1024 * 1024, // 5MB per field
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.ms-excel',
      ],
      debug: true, // Enable debug logging
    }),
    (req: Request, res: Response) => {
      if ((req as any).multipartError) {
        return res
          .status((req as any).multipartError.statusCode)
          .json({ error: (req as any).multipartError });
      }

      const files = (req as any).files || {};
      const fields = (req as any).fields || {};

      res.json({
        success: true,
        uploaded: {
          totalFiles: Object.keys(files).length,
          totalFields: Object.keys(fields).length,
          details: {
            files,
            fields,
          },
        },
      });
    },
  );

  return app;
};

/**
 * EXAMPLE 5: With error handling middleware
 */
const example5 = () => {
  const app = express();

  // Apply middleware
  app.post(
    '/upload/with-error-handler',
    multipartMiddleware({
      maxSize: 100 * 1024 * 1024, // 100MB
      debug: false,
    }),
  );

  // Handler
  app.post('/upload/with-error-handler', (req: Request, res: Response) => {
    if ((req as any).multipartError) {
      return res
        .status((req as any).multipartError.statusCode)
        .json({ error: (req as any).multipartError });
    }

    const hasAnyFiles = hasFiles(req);
    if (!hasAnyFiles) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    res.json({
      success: true,
      files: (req as any).files,
      fields: (req as any).fields,
    });
  });

  return app;
};

/**
 * EXAMPLE 6: Complete production setup with validation
 */
const example6 = () => {
  const app = express();

  // Multipart middleware
  app.post(
    '/api/upload',
    multipartMiddleware({
      maxSize: 500 * 1024 * 1024, // 500MB
      maxFiles: 20,
      maxFields: 50,
      fileSize: 100 * 1024 * 1024, // 100MB per file
      fieldSize: 10 * 1024 * 1024, // 10MB per field
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json',
      ],
      debug: process.env.NODE_ENV === 'development',
    }),
    (req: Request, res: Response) => {
      // Check for errors
      if ((req as any).multipartError) {
        const error = (req as any).multipartError;
        console.error(`[Upload Error] ${error.code}: ${error.message}`);
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      }

      try {
        const files = (req as any).files || {};
        const fields = (req as any).fields || {};

        // Validate required fields
        if (!fields.userId) {
          return res.status(400).json({ error: 'userId field is required' });
        }

        // Validate at least one file
        if (Object.keys(files).length === 0) {
          return res.status(400).json({ error: 'At least one file is required' });
        }

        // Process files
        const uploadedFiles = [];
        for (const [fieldName, fileData] of Object.entries(files)) {
          if (Array.isArray(fileData)) {
            uploadedFiles.push(
              ...fileData.map((f: any) => ({
                fieldName,
                name: f.name,
                size: f.size,
                mimeType: f.mimeType,
              })),
            );
          } else {
            uploadedFiles.push({
              fieldName,
              name: (fileData as any).name,
              size: (fileData as any).size,
              mimeType: (fileData as any).mimeType,
            });
          }
        }

        res.json({
          success: true,
          message: 'Files uploaded successfully',
          userId: fields.userId,
          uploadedFiles,
          metadata: fields,
        });
      } catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).json({
          error: 'Failed to process upload',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  return app;
};

/**
 * EXAMPLE 7: TypeScript with custom types
 */
interface UploadRequest extends Request {
  files?: Record<string, any>;
  fields?: Record<string, any>;
  multipartError?: any;
}

const example7 = () => {
  const app = express();

  app.post(
    '/api/upload-typed',
    multipartMiddleware(),
    (req: UploadRequest, res: Response) => {
      if (req.multipartError) {
        return res.status(req.multipartError.statusCode).json({
          error: req.multipartError.message,
        });
      }

      res.json({
        files: req.files,
        fields: req.fields,
      });
    },
  );

  return app;
};

export { example1, example2, example3, example4, example5, example6, example7 };
