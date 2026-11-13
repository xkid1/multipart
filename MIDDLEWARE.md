# @xkid1/multipart Middleware Guide

Complete guide to using `@xkid1/multipart` as middleware in Express, NestJS, and other Node.js frameworks with support for multiple file uploads.

## Table of Contents

- [Installation](#installation)
- [Express Middleware](#express-middleware)
- [NestJS Middleware](#nestjs-middleware)
- [Multiple File Uploads](#multiple-file-uploads)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [API Reference](#api-reference)

---

## Installation

```bash
npm install @xkid1/multipart
# or
yarn add @xkid1/multipart
```

---

## Express Middleware

### Basic Setup

```typescript
import express from 'express';
import { multipartMiddleware } from '@xkid1/multipart/middleware/express';

const app = express();

app.post('/upload', multipartMiddleware(), (req, res) => {
  if (req.multipartError) {
    return res.status(req.multipartError.statusCode)
      .json({ error: req.multipartError.message });
  }

  // Access files and fields
  const files = req.files;    // File uploads
  const fields = req.fields;  // Text fields
  const body = req.body;      // Combined data

  res.json({ success: true, files, fields });
});

app.listen(3000);
```

### Single File Upload

```typescript
app.post('/upload/single', multipartMiddleware(), (req, res) => {
  const file = req.files?.['file'];
  
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
      buffer: file.buffer, // Raw file data
    }
  });
});
```

### Multiple Files (Same Field)

```typescript
app.post('/upload/multiple', multipartMiddleware(), (req, res) => {
  const files = req.files?.['files'];

  if (!files) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  // Handle both single and multiple files
  const fileList = Array.isArray(files) ? files : [files];

  res.json({
    success: true,
    count: fileList.length,
    files: fileList.map(f => ({
      name: f.name,
      size: f.size,
      mimeType: f.mimeType
    }))
  });
});
```

### With Utility Functions

```typescript
import {
  multipartMiddleware,
  getFile,
  getField,
  hasFiles
} from '@xkid1/multipart/middleware/express';

app.post('/upload', multipartMiddleware(), (req, res) => {
  if (!hasFiles(req)) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const avatar = getFile(req, 'avatar');
  const description = getField(req, 'description');

  res.json({ avatar, description });
});
```

---

## NestJS Middleware

### Module Configuration

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MultipartMiddleware } from '@xkid1/multipart/middleware/nestjs';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new MultipartMiddleware())
      .forRoutes('/upload');
  }
}
```

### Controller Implementation

```typescript
import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('upload')
export class UploadController {
  @Post()
  uploadFiles(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode)
        .json({ error: req.multipartError.message });
    }

    const files = req.files;
    const fields = req.fields;

    res.json({ success: true, files, fields });
  }
}
```

### With Advanced Configuration

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MultipartMiddleware } from '@xkid1/multipart/middleware/nestjs';

@Module({})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        new MultipartMiddleware({
          maxSize: 500 * 1024 * 1024,    // 500MB total
          maxFiles: 20,
          maxFields: 50,
          fileSize: 100 * 1024 * 1024,   // 100MB per file
          fieldSize: 10 * 1024 * 1024,   // 10MB per field
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'application/pdf'
          ],
          debug: true
        })
      )
      .forRoutes('upload');
  }
}
```

---

## Multiple File Uploads

### HTML Form Example

```html
<!-- Upload multiple files to same field -->
<form action="/api/upload" method="POST" enctype="multipart/form-data">
  <!-- Multiple files with same name attribute -->
  <input type="file" name="files" multiple />
  
  <!-- Form metadata -->
  <input type="text" name="title" placeholder="Title" />
  <textarea name="description"></textarea>
  
  <button type="submit">Upload</button>
</form>
```

### JavaScript (Fetch API)

```javascript
const fileInput = document.querySelector('input[type="file"]');
const formData = new FormData();

// Loop through all selected files and append to same key
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('files', fileInput.files[i]);
}

// Add other fields
formData.append('title', 'My Project');
formData.append('description', 'Project description');

fetch('/api/upload', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### JavaScript (Axios)

```javascript
const fileInput = document.querySelector('input[type="file"]');
const formData = new FormData();

// Append multiple files
for (let i = 0; i < fileInput.files.length; i++) {
  formData.append('files', fileInput.files[i]);
}

formData.append('title', 'My Project');

axios.post('/api/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));
```

### Handler Implementation

```typescript
app.post('/api/upload', multipartMiddleware(), (req, res) => {
  const files = req.files?.['files'];
  const title = req.fields?.['title'];

  if (!files) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  // Handle both single and multiple files
  const fileList = Array.isArray(files) ? files : [files];

  res.json({
    success: true,
    title,
    uploadedCount: fileList.length,
    files: fileList.map(f => ({
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      extension: f.extension
    }))
  });
});
```

---

## Configuration

### MiddlewareOptions

```typescript
interface MiddlewareOptions {
  // Maximum allowed body size in bytes (default: 100MB)
  maxSize?: number;

  // Allowed MIME types for file uploads (default: all)
  allowedMimeTypes?: string[];

  // Maximum number of fields (default: 1000)
  maxFields?: number;

  // Maximum number of files (default: 100)
  maxFiles?: number;

  // Enable debug logging (default: false)
  debug?: boolean;

  // Field size limit in bytes (default: 10MB)
  fieldSize?: number;

  // File size limit in bytes (default: 50MB)
  fileSize?: number;
}
```

### Example Configurations

**Small Files (Images Only)**
```typescript
{
  maxSize: 100 * 1024 * 1024,      // 100MB total
  maxFiles: 10,
  fileSize: 10 * 1024 * 1024,      // 10MB per file
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
}
```

**Large Files (Videos)**
```typescript
{
  maxSize: 5 * 1024 * 1024 * 1024,  // 5GB total
  maxFiles: 5,
  fileSize: 1024 * 1024 * 1024,     // 1GB per file
  allowedMimeTypes: ['video/mp4', 'video/webm']
}
```

**Enterprise (Everything)**
```typescript
{
  maxSize: 1024 * 1024 * 1024,      // 1GB total
  maxFiles: 100,
  maxFields: 500,
  fileSize: 500 * 1024 * 1024,      // 500MB per file
  fieldSize: 50 * 1024 * 1024,      // 50MB per field
  allowedMimeTypes: [
    'image/*',
    'application/pdf',
    'text/*',
    'application/json'
  ],
  debug: process.env.NODE_ENV === 'development'
}
```

---

## Error Handling

### Error Types

```typescript
interface MiddlewareError {
  code: string;              // Error code
  message: string;           // Human-readable message
  statusCode: number;        // HTTP status code
  field?: string;            // Field name (if applicable)
  size?: number;             // Actual size
  limit?: number;            // Size limit
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| NO_BOUNDARY | 400 | No boundary in Content-Type |
| SIZE_LIMIT_EXCEEDED | 413 | Body size exceeds limit |
| FILE_LIMIT_EXCEEDED | 400 | Maximum files exceeded |
| FIELD_LIMIT_EXCEEDED | 400 | Maximum fields exceeded |
| FILE_SIZE_EXCEEDED | 400 | Single file exceeds limit |
| FIELD_SIZE_EXCEEDED | 400 | Single field exceeds limit |
| MIME_TYPE_NOT_ALLOWED | 400 | MIME type not in whitelist |
| PARSE_ERROR | 400 | Parsing error |
| REQUEST_ERROR | 500 | Request stream error |
| INIT_ERROR | 500 | Initialization error |

### Express Error Handling

```typescript
app.post('/upload', multipartMiddleware(), (req, res) => {
  if (req.multipartError) {
    const error = req.multipartError;
    
    console.error(`Upload error: ${error.code} - ${error.message}`);
    
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.size && error.limit ? {
        size: error.size,
        limit: error.limit
      } : undefined
    });
  }

  // Process upload...
  res.json({ success: true });
});
```

### NestJS Error Handling

```typescript
@Controller('upload')
export class UploadController {
  @Post()
  uploadFiles(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      const error = req.multipartError;
      
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    // Process upload...
    res.json({ success: true });
  }
}
```

---

## Examples

### Complete Express Server

```typescript
import express from 'express';
import { multipartMiddleware } from '@xkid1/multipart/middleware/express';

const app = express();

// Single file upload
app.post('/upload/single', multipartMiddleware(), (req, res) => {
  if (req.multipartError) {
    return res.status(req.multipartError.statusCode)
      .json({ error: req.multipartError.message });
  }

  const file = req.files?.['file'];
  if (!file) return res.status(400).json({ error: 'No file' });

  res.json({ success: true, file });
});

// Multiple files upload
app.post('/upload/multiple', multipartMiddleware(), (req, res) => {
  if (req.multipartError) {
    return res.status(req.multipartError.statusCode)
      .json({ error: req.multipartError.message });
  }

  const files = req.files?.['files'] || [];
  const fileList = Array.isArray(files) ? files : [files];

  res.json({ success: true, count: fileList.length });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Complete NestJS Application

```typescript
import { NestFactory } from '@nestjs/core';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Controller, Post, Req, Res } from '@nestjs/common';
import { MultipartMiddleware } from '@xkid1/multipart/middleware/nestjs';
import type { Response } from 'express';

@Controller('upload')
export class UploadController {
  @Post()
  uploadFiles(@Req() req: any, @Res() res: Response) {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode)
        .json({ error: req.multipartError.message });
    }

    res.json({
      success: true,
      files: req.files,
      fields: req.fields
    });
  }
}

@Module({
  controllers: [UploadController]
})
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(new MultipartMiddleware({
        maxSize: 500 * 1024 * 1024,
        maxFiles: 20
      }))
      .forRoutes('upload');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(UploadModule);
  await app.listen(3000);
}

bootstrap();
```

---

## API Reference

### Express Middleware

#### `multipartMiddleware(options?)`
Creates Express middleware for multipart form-data parsing.

**Returns:** Express middleware function

**Attaches to request:**
- `req.files` - Uploaded files grouped by field name
- `req.fields` - Text fields grouped by field name
- `req.body` - Combined parsed data
- `req.multipartError` - Error object if parsing fails

#### Utility Functions

**`hasFiles(req, fieldName?)`** - Check if files exist
**`getFile(req, fieldName)`** - Get file(s) from field
**`getField(req, fieldName)`** - Get text field value

### NestJS Middleware

#### `MultipartMiddleware`
NestJS middleware class for multipart parsing.

**Constructor:** `new MultipartMiddleware(options?)`

**Attaches to request:**
- `req.files` - Uploaded files grouped by field name
- `req.fields` - Text fields grouped by field name
- `req.body` - Combined parsed data
- `req.multipartError` - Error object if parsing fails

---

## Best Practices

1. **Always check for errors** before accessing files/fields
2. **Use MIME type validation** for security
3. **Set reasonable size limits** based on use case
4. **Enable debug mode only in development**
5. **Handle both single and multiple files** in handlers
6. **Validate file contents** not just extension
7. **Stream large files** to storage instead of buffering
8. **Use TypeScript** for type safety

---

## Performance

- Fast parsing: ~556 MB/s (benchmark included)
- Zero external dependencies
- Efficient buffer management
- Support for very large files (tested up to 1GB+)

---

## Troubleshooting

**Q: Multiple files not grouped in array?**
A: Single file returns as object, multiple files return as array. Check with `Array.isArray()`.

**Q: Content-Type issues?**
A: Ensure `Content-Type: multipart/form-data; boundary=...` is set correctly.

**Q: Files are undefined?**
A: Check if `req.multipartError` exists - parsing may have failed.

**Q: Performance issues with large files?**
A: Stream to disk instead of buffering. Use `file.buffer` for small files only.

---

## License

MIT - See LICENSE file for details
