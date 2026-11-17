# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-17

### Added
- Express.js middleware export (`@xkid1/multipart/middleware/express`) with `multipartExpress`, `multipartErrorHandler`, and utility helpers.
- NestJS middleware export (`@xkid1/multipart/middleware/nestjs`) with `MultipartNestjs`.
- Local storage provider (`@xkid1/multipart/storage/local`) supporting single and multiple file uploads, directory traversal protection, and URL resolution.
- AWS S3 storage provider (`@xkid1/multipart/storage/s3`) with `uploadToS3`, `uploadMultipleToS3`, `deleteFromS3`, and presigned URL generation.
- Azure Blob Storage provider (`@xkid1/multipart/storage/azure`) with `uploadToAzureBlob`, `uploadMultipleToAzureBlob`, `deleteFromAzureBlob`, and SAS URL generation.
- Full TypeScript type definitions and subpath exports in `package.json`.
- Comprehensive test coverage for core parser, middleware, encoding detection, and all storage backends.

### Changed
- Converted optional heavy integrations (`express`, `@nestjs/common`, `@aws-sdk/client-s3`, `@azure/storage-blob`) to optional peer dependencies.
- Enhanced size limit and error handling in Express and NestJS middleware to prevent hanging requests and unhandled exceptions.
- Hardened Azure Blob SAS URL generation with `StorageSharedKeyCredential`.
- Improved pre-signed S3 URL generation with dynamic import of `@aws-sdk/s3-request-presigner`.

## [0.1.0] - 2026-11-13

### Added
- Initial release with zero-dependency core multipart form-data parser.
- RFC 2046 and RFC 2388 compliance.
- Automatic charset and encoding detection.
- Stream and buffer parsing utilities.
