// Type-level usage of the public API, compiled by types.mjs under several
// module-resolution settings. It never runs; it only has to typecheck.
import { S3Client } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import {
  DEFAULT_LIMITS,
  extractBoundary,
  type FileData,
  multipart,
  MultiPartError,
  MultiPartErrorCode,
  parseMultipartWithDuplicates,
  type ParsedFormData,
  type StorageAdapter,
} from '@xkid1/multipart';
import {
  getFile,
  multipartErrorHandler,
  multipartExpress,
} from '@xkid1/multipart/middleware/express';
import {
  createMultipartNestjs,
  MultipartNestjs,
  multipartNestjs,
} from '@xkid1/multipart/middleware/nestjs';
import {
  LocalStorage,
  type LocalStorageUploadResponse,
} from '@xkid1/multipart/storage/local';
import { S3Storage, type S3UploadResponse } from '@xkid1/multipart/storage/s3';
import { AzureBlobStorage, getAzureBlobSasUrl } from '@xkid1/multipart/storage/azure';
import express from 'express';

const app = express();

app.post(
  '/upload',
  multipartExpress({ maxFiles: 2, allowedMimeTypes: ['image/*'] }),
  (req, res) => {
    // Request augmentation: these are typed without casts.
    const files: Record<string, FileData | FileData[]> | undefined = req.files;
    const fields: Record<string, string | string[]> | undefined = req.fields;
    if (req.multipartError) {
      res.status(req.multipartError.statusCode).json({ code: req.multipartError.code });
      return;
    }
    const avatar = getFile(req, 'avatar');
    res.json({ files: Object.keys(files ?? {}), fields, hasAvatar: avatar !== null });
  },
);
app.post('/next', multipartExpress({ onError: 'next' }), (_req, res) => {
  res.end();
});
app.use(multipartErrorHandler);

// Real SDK clients satisfy the library's client interfaces.
const s3 = new S3Client({ region: 'us-east-1' });
const container = BlobServiceClient.fromConnectionString(
  'UseDevelopmentStorage=true',
).getContainerClient('c');

const local: StorageAdapter<LocalStorageUploadResponse> = new LocalStorage({
  directory: './uploads',
});
const s3Storage: StorageAdapter<S3UploadResponse> = new S3Storage(s3, {
  bucket: 'b',
  region: 'us-east-1',
});
const azure = new AzureBlobStorage(container, {
  accountName: 'a',
  container: 'c',
  tier: 'Cool',
});
const sas: string = getAzureBlobSasUrl('blob', container, 'key', new Date(), 'r');

async function store(file: FileData): Promise<string[]> {
  const results = await Promise.all([
    local.upload(file),
    s3Storage.upload(file),
    azure.upload(file),
  ]);
  return [results[0].path, results[1].key, results[2].name];
}

const boundary: string | undefined = extractBoundary('multipart/form-data; boundary=x');
const simple: Record<string, FileData | string> = multipart(
  Buffer.alloc(0),
  boundary ?? 'x',
);
try {
  const parsed: ParsedFormData = parseMultipartWithDuplicates(Buffer.alloc(0), 'x', {
    maxSize: DEFAULT_LIMITS.maxSize,
  });
  void parsed;
} catch (error) {
  if (error instanceof MultiPartError && error.code === MultiPartErrorCode.LIMIT_FILES) {
    const status: number | undefined = error.statusCode;
    void status;
  }
}

void [
  store,
  sas,
  simple,
  MultipartNestjs,
  createMultipartNestjs({ maxFiles: 1 }),
  multipartNestjs(),
];
