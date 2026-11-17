# @xkid1/multipart

[![npm version](https://img.shields.io/npm/v/@xkid1/multipart)](https://www.npmjs.com/package/@xkid1/multipart)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

A `multipart/form-data` parser for Node.js, written in TypeScript with **zero runtime
dependencies**. Includes Express and NestJS middleware, plus storage helpers for the
local filesystem, AWS S3 and Azure Blob Storage.

- **Byte-exact** file contents, verified against the platform's own `FormData` encoder
- **Safe defaults**: size/count limits, MIME allow-lists, path-traversal-proof storage,
  no prototype pollution from field names
- **Express & NestJS** middleware with typed `req.files` / `req.fields`
- **Storage adapters** for Local, S3 and Azure behind one `StorageAdapter` interface
- **ESM and CommonJS** builds with types for `node16`, `bundler` and `node10` resolution

## Installation

```bash
npm install @xkid1/multipart
```

Then install only the SDKs for the integrations you use:

| Integration         | Install                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| Core parser / local | nothing else                                                              |
| Express             | `express`                                                                 |
| NestJS              | `@nestjs/common` (Express platform)                                       |
| AWS S3              | `@aws-sdk/client-s3` (+ `@aws-sdk/s3-request-presigner` for signed URLs) |
| Azure Blob Storage  | `@azure/storage-blob`                                                     |

## Express

```typescript
import express from 'express';
import { multipartExpress } from '@xkid1/multipart/middleware/express';

const app = express();

app.post(
  '/upload',
  multipartExpress({ maxFiles: 5, fileSize: 10 * 1024 * 1024, allowedMimeTypes: ['image/*'] }),
  (req, res) => {
    if (req.multipartError) {
      return res.status(req.multipartError.statusCode).json({ error: req.multipartError });
    }
    const avatar = req.files?.avatar; // FileData | FileData[] | undefined
    const name = req.fields?.name; //    string | string[] | undefined
    res.json({ name, received: avatar !== undefined });
  },
);
```

The middleware sets `req.body` (every value), `req.files` and `req.fields`. Requests that
aren't `multipart/form-data` pass through untouched. When a field name repeats, its value
becomes an array.

**Error handling.** By default errors are attached to `req.multipartError` and `next()` is
called, so your handler decides how to respond. To use Express error middleware instead:

```typescript
import { multipartErrorHandler, multipartExpress } from '@xkid1/multipart/middleware/express';

app.post('/upload', multipartExpress({ onError: 'next' }), handler);
app.use(multipartErrorHandler); // responds with error.statusCode and { error }
```

## NestJS

Nest instantiates middleware classes itself, so pass the **class**, or use
`createMultipartNestjs()` to build one with options:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { createMultipartNestjs, MultipartNestjs } from '@xkid1/multipart/middleware/nestjs';

@Module({ controllers: [UploadController] })
export class UploadModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MultipartNestjs).forRoutes('upload'); // default limits
    consumer
      .apply(createMultipartNestjs({ maxFiles: 1, allowedMimeTypes: ['application/pdf'] }))
      .forRoutes('documents');
  }
}
```

> **Note:** `consumer.apply(new MultipartNestjs())` (an instance) is silently ignored by
> Nest, so uploads are never parsed. Use one of the forms above.

In the controller, read `req.files` and `req.fields` via `@Req()`. Failures are passed to
`next()` as an `HttpException` with the matching status (400, 413 or 415) and a body of
`{ statusCode, message, error: <code> }`. A functional form, `multipartNestjs(options)`,
is also available.

## Parsing a buffer directly

```typescript
import { extractBoundary, parseMultipartWithDuplicates } from '@xkid1/multipart';

const boundary = extractBoundary(request.headers['content-type']);
const data = parseMultipartWithDuplicates(body, boundary!, { maxFiles: 10 });
// { title: 'Hello', tags: ['a', 'b'], doc: { name, mimeType, size, extension, encoding, buffer } }
```

`multipart(body, boundary)` is a simpler variant: last value wins for repeated names and no
limits apply. Use `parseMultipartWithDuplicates` for untrusted input.

### Options and defaults

| Option             | Default  | Applies to                                                     |
| ------------------ | -------- | -------------------------------------------------------------- |
| `maxSize`          | 100 MiB  | whole request body (enforced while streaming)                  |
| `fileSize`         | 50 MiB   | each file                                                      |
| `fieldSize`        | 10 MiB   | each text field                                                |
| `maxFiles`         | 100      | number of files                                                |
| `maxFields`        | 1000     | number of text fields                                          |
| `allowedMimeTypes` | all      | file MIME types, case-insensitive, wildcards like `image/*`    |
| `debug`            | `false`  | logs field/file names and sizes (never values)                 |
| `onError`          | `attach` | Express only: `'attach'` to `req.multipartError`, or `'next'`  |

### File data

```typescript
interface FileData {
  name: string; //      original filename (UTF-8 names via filename* are decoded)
  mimeType: string; //  lowercase type/subtype without parameters
  size: number; //      bytes
  extension: string; // '.pdf', or '' when there is none
  encoding: string; //  detected text encoding, or 'binary'
  buffer: Buffer; //    exact file contents
}
```

### Errors

Every parser and middleware error is a `MultiPartError` with a stable `code` and a
suggested HTTP `statusCode`:

| Code                    | Status | Meaning                                     |
| ----------------------- | ------ | ------------------------------------------- |
| `NO_BOUNDARY`           | 400    | Content-Type has no boundary                |
| `LIMIT_BODY_SIZE`       | 413    | body larger than `maxSize`                  |
| `LIMIT_FILE_SIZE`       | 413    | a file larger than `fileSize`               |
| `LIMIT_FIELD_SIZE`      | 413    | a field larger than `fieldSize`             |
| `LIMIT_FILES`           | 413    | more than `maxFiles` files                  |
| `LIMIT_FIELDS`          | 413    | more than `maxFields` fields                |
| `MIME_TYPE_NOT_ALLOWED` | 415    | file type not in `allowedMimeTypes`         |
| `REQUEST_ERROR`         | 400    | stream error or client disconnect           |
| `BODY_ALREADY_CONSUMED` | 500    | another middleware already read the body    |

```typescript
import { MultiPartError, MultiPartErrorCode } from '@xkid1/multipart';

if (error instanceof MultiPartError && error.code === MultiPartErrorCode.LIMIT_FILES) {
  // ...
}
```

## Storage

Every provider implements the same `StorageAdapter` interface (`upload`, `uploadMany`,
`delete`, `exists`), so you can switch backends without touching route code. Standalone
functions such as `uploadToS3` are also exported.

Storage errors are `MultiPartError`s with `code`, `statusCode`, `filename` and `details`.

### Local filesystem

```typescript
import { LocalStorage } from '@xkid1/multipart/storage/local';

const storage = new LocalStorage({ directory: './uploads', prefix: 'avatars' });

const saved = await storage.upload(req.files.avatar as FileData);
saved.path; //         'avatars/me.png'  (relative to directory)
saved.absolutePath; // '/srv/app/uploads/avatars/me.png'
```

- Client filenames are reduced to a safe basename, so `../../etc/passwd` can't escape the
  directory.
- Existing files are never silently replaced: a second `me.png` is saved as `me-1.png`.
  Set `overwrite: true` to replace, or `preserveFilename: false` for generated unique names.
- `permissions` (for example `0o600`) is applied after writing.

### AWS S3

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { S3Storage } from '@xkid1/multipart/storage/s3';

const storage = new S3Storage(new S3Client({ region: 'eu-west-1' }), {
  bucket: 'my-bucket',
  region: 'eu-west-1',
  prefix: 'uploads/',
  serverSideEncryption: 'AES256',
});

const { key, url, etag } = await storage.upload(file);
const signedUrl = await storage.getUrl(key, 3600); // needs @aws-sdk/s3-request-presigner
```

Keys are `<prefix><timestamp>-<random>-<filename>`, so same-named uploads never collide.
`ContentType` and a `ContentDisposition` that keeps the original (UTF-8) filename are
stored with the object. Other options: `acl`, `metadata`, `sseKmsKeyId`, `storageClass`,
`tagging`, `contentType`, `contentDisposition` (a string, or `false` to omit it).

### Azure Blob Storage

```typescript
import { BlobServiceClient } from '@azure/storage-blob';
import { AzureBlobStorage, getAzureBlobSasUrl } from '@xkid1/multipart/storage/azure';

const container = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!,
).getContainerClient('uploads');

const storage = new AzureBlobStorage(container, {
  accountName: 'myaccount',
  container: 'uploads',
  prefix: 'files/',
  tier: 'Hot',
});

const { name, uri } = await storage.upload(file);

// Read-only by default; pass permissions such as 'rw' explicitly to allow writes.
const sasUrl = getAzureBlobSasUrl(name, container, process.env.AZURE_STORAGE_KEY!);
```

## Limitations

- **Bodies are buffered in memory** (up to `maxSize`, 100 MiB by default) before parsing.
  `maxSize` is enforced while the body streams in, and the request is rejected as soon as
  it's exceeded, but files are not streamed to storage. For very large uploads, lower
  `maxSize` or use a streaming parser.
- File buffers are views into the request body (zero-copy), so keeping one `FileData`
  alive keeps the whole body in memory. Copy with `Buffer.from(file.buffer)` if you store
  it long-term.
- The NestJS middleware supports the Express platform.

## Development

```bash
yarn install
yarn check   # format, lint, typecheck, tests with coverage, build
yarn e2e     # test the packed tarball as an end user would (see e2e/README.md)
```

CI runs the end-user suite on Node 18, 20, 22, 24 and 26 with npm, plus pnpm, against
Express 4 and 5, NestJS 11, and S3/Azure emulators.

See [Contributing.md](./Contributing.md) for guidelines and [CHANGELOG.md](./CHANGELOG.md)
for release notes.

## License

MIT. See [LICENSE](LICENSE).
