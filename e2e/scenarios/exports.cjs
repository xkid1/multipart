// Scenario: CommonJS consumers (`require`), e.g. NestJS projects compiled to CommonJS.
'use strict';

const h = require('./_harness.cjs');

const SUBPATHS = {
  '@xkid1/multipart': [
    'multipart',
    'parseMultipartWithDuplicates',
    'multipartExpress',
    'LocalStorage',
    'MultiPartError',
  ],
  '@xkid1/multipart/middleware/express': [
    'multipartExpress',
    'multipartErrorHandler',
    'getFile',
  ],
  '@xkid1/multipart/middleware/nestjs': [
    'MultipartNestjs',
    'createMultipartNestjs',
    'multipartNestjs',
  ],
  '@xkid1/multipart/storage/local': [
    'LocalStorage',
    'uploadToLocal',
    'deleteFromLocal',
    'existsInLocal',
  ],
  '@xkid1/multipart/storage/s3': [
    'S3Storage',
    'uploadToS3',
    'existsInS3',
    'getS3PresignedUrl',
  ],
  '@xkid1/multipart/storage/azure': [
    'AzureBlobStorage',
    'uploadToAzureBlob',
    'getAzureBlobSasUrl',
  ],
};

for (const [id, names] of Object.entries(SUBPATHS)) {
  const resolved = require.resolve(id);
  h.check(
    `require('${id}') resolves to the CommonJS build`,
    resolved.includes('/dist/cjs/'),
    resolved.split('node_modules/')[1],
  );
  const mod = require(id);
  const missing = names.filter((name) => typeof mod[name] !== 'function');
  h.check(
    `require('${id}') exposes ${names.length} expected exports`,
    missing.length === 0,
    missing.join(', '),
  );
}

// Using it: a CJS caller gets working classes, not ESM wrappers.
const {
  MultiPartError,
  MultiPartErrorCode,
  parseMultipartWithDuplicates,
} = require('@xkid1/multipart');
try {
  parseMultipartWithDuplicates(Buffer.alloc(10), 'b', { maxSize: 1 });
  h.check('limit errors are MultiPartError instances (CJS)', false, 'no error thrown');
} catch (error) {
  h.check(
    'limit errors are MultiPartError instances (CJS)',
    error instanceof MultiPartError &&
      error.code === MultiPartErrorCode.LIMIT_BODY_SIZE &&
      error.statusCode === 413,
    `${error.name} ${error.code}`,
  );
}

h.done();
