# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-17

### Added
- Express middleware (`@xkid1/multipart/middleware/express`): `multipartExpress`, `multipartErrorHandler`, `hasFiles`/`getFile`/`getField`. `req.files`, `req.fields` and `req.multipartError` are typed. `onError: 'next'` passes errors to Express error handlers.
- NestJS middleware (`@xkid1/multipart/middleware/nestjs`): `MultipartNestjs`, `createMultipartNestjs(options)` and functional `multipartNestjs(options)`. Errors become `HttpException`s with the matching status (400/413/415).
- Storage adapters implementing a common `StorageAdapter` interface (`upload`, `uploadMany`, `delete`, `exists`): `LocalStorage`, `S3Storage`, `AzureBlobStorage`. Also `existsInLocal`, `existsInS3` and `existsInAzureBlob`.
- Local, S3 and Azure helpers: `uploadTo*`, `uploadMultipleTo*`, `deleteFrom*`, S3 presigned URLs and Azure SAS URLs.
- `MultiPartError` codes (`MultiPartErrorCode`) with an HTTP `statusCode`, plus `size`/`limit` on limit errors.
- `iterateParts`, `extractBoundary`, `isMultipartFormData`, `splitFormData`, `isMimeTypeAllowed`, `DEFAULT_LIMITS`.
- Each subpath (`/storage/s3`, `/storage/azure`, `/storage/local`, `/middleware/express`, `/middleware/nestjs`) also exports its config, response and client types, e.g. `import { S3Storage, type S3UploadResponse } from '@xkid1/multipart/storage/s3'`.
- Dual ESM/CommonJS build with per-format type declarations, plus `typesVersions` for `node10` resolution (default NestJS projects).

### Changed
- `express`, `@nestjs/common`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` and `@azure/storage-blob` are optional peer dependencies.
- `allowedMimeTypes` is case-insensitive and supports wildcards (`image/*`). `mimeType` is the lowercase `type/subtype` without parameters.
- Field values are no longer trimmed; whitespace is preserved.
- Empty file inputs (`filename=""` with no content) are skipped.
- Result objects have a `null` prototype, so field names like `__proto__` are plain data.
- Local storage never silently overwrites: same-named files get a `-1`, `-2`, ... suffix (`overwrite: true` to replace). `preserveFilename: false` generates unique names. `permissions` in the response is the file's real mode.
- S3 keys and Azure blob names include a random component, so same-named uploads in the same millisecond no longer collide.
- S3 and Azure uploads store a `Content-Disposition` with the original filename (configurable with `contentDisposition`).
- Azure uploads no longer make an extra `getProperties()` request.
- `getAzureBlobSasUrl` defaults to **read-only** (`'r'`) permissions; pass a `permissions` argument to grant more.
- The `debug` option logs field names and sizes only, never values.

### Fixed
- File contents included the CRLF that precedes the next boundary, corrupting every uploaded file by 2 bytes.
- Boundary-like text inside content (for example `--boundary` within a file) split the part.
- Header names were matched case-sensitively.
- `name=` could be read from inside `filename=` when `filename` came first.
- A file part without `Content-Type` was treated as a text field.
- `extractExtension('README')` returned `.README`.
- `maxFields`/`maxFiles` rejected requests with exactly the allowed number.
- `maxSize: 0` was ignored.
- Middleware could hang when the client disconnected or the body was already consumed.
- Path checks in `deleteFromLocal` used a string prefix test.
- Published type declarations referenced internal path aliases (`@types`, `@utils`, ...) and didn't resolve for consumers.

### Deprecated
- `extractPart` and `shouldSkipPart`; use `iterateParts`.

## [0.1.0] - 2026-11-13

### Added
- Initial release with zero-dependency core multipart form-data parser.
- RFC 2046 and RFC 2388 compliance.
- Automatic charset and encoding detection.
- Stream and buffer parsing utilities.
