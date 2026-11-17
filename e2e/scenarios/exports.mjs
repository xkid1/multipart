// Scenario: ES module consumers (`import`).
import h from './_harness.cjs';

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
  // import.meta.resolve is unflagged from Node 20.6.
  if (typeof import.meta.resolve === 'function') {
    const resolved = await import.meta.resolve(id);
    h.check(
      `import '${id}' resolves to the ESM build`,
      resolved.includes('/dist/esm/'),
      resolved.split('node_modules/')[1],
    );
  } else {
    h.skip(
      `import '${id}' resolves to the ESM build`,
      'import.meta.resolve unavailable on this Node',
    );
  }
  const mod = await import(id);
  const missing = names.filter((name) => typeof mod[name] !== 'function');
  h.check(
    `import '${id}' exposes ${names.length} expected exports`,
    missing.length === 0,
    missing.join(', '),
  );
}

const { multipart } = await import('@xkid1/multipart');
const form = new FormData();
form.append('a', '1');
const { body, boundary } = await h.encodeForm(form);
h.check('ESM import parses a body', multipart(body, boundary).a === '1');

h.done();
