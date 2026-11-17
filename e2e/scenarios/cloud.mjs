// Scenario: AWS S3 and Azure Blob with the real SDKs, against local emulators
// (S3Mock and Azurite; see e2e/emulators.sh). Endpoints come from the environment:
//   E2E_S3_ENDPOINT     default http://127.0.0.1:19090
//   E2E_AZURE_ENDPOINT  default http://127.0.0.1:20000/devstoreaccount1
//   E2E_REQUIRE_CLOUD=1 makes unreachable emulators a failure instead of a skip.
import { randomBytes } from 'node:crypto';
import net from 'node:net';

import h from './_harness.cjs';

const S3_ENDPOINT = process.env.E2E_S3_ENDPOINT ?? 'http://127.0.0.1:19090';
const AZURE_ENDPOINT =
  process.env.E2E_AZURE_ENDPOINT ?? 'http://127.0.0.1:20000/devstoreaccount1';
const REQUIRED = process.env.E2E_REQUIRE_CLOUD === '1';
const RUN_ID = `e2e-${Date.now()}-${randomBytes(3).toString('hex')}`;

const reachable = (endpoint) =>
  new Promise((resolve) => {
    const { hostname, port } = new URL(endpoint);
    const socket = net.connect({ host: hostname, port: Number(port), timeout: 2000 });
    socket.once('connect', () => resolve(socket.end() && true));
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => resolve(socket.destroy() && false));
  });

const unavailable = (provider, endpoint) => {
  const reason = `emulator not reachable at ${endpoint}; start it with: bash e2e/emulators.sh up`;
  if (REQUIRED) h.check(`${provider}: emulator reachable`, false, reason);
  else h.skip(`${provider} scenario`, reason);
};

// A FileData produced exactly as the middleware would produce it.
const { multipart } = await import('@xkid1/multipart');
const content = Buffer.concat([Buffer.from('%PDF-1.7\r\n'), randomBytes(512 * 1024)]);
const form = new FormData();
form.append('doc', new Blob([content], { type: 'application/pdf' }), 'résumé final.pdf');
const encoded = await h.encodeForm(form);
const file = multipart(encoded.body, encoded.boundary).doc;
const UTF8_DISPOSITION = `filename*=UTF-8''r%C3%A9sum%C3%A9%20final.pdf`;

// ─────────────── AWS S3 ───────────────
if (!(await reachable(S3_ENDPOINT))) {
  unavailable('S3', S3_ENDPOINT);
} else {
  const { CreateBucketCommand, GetObjectCommand, S3Client } =
    await import('@aws-sdk/client-s3');
  const { S3Storage } = await import('@xkid1/multipart/storage/s3');

  const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: 'e2e', secretAccessKey: 'e2e' },
  });
  const bucket = RUN_ID;
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  const storage = new S3Storage(s3, {
    bucket,
    region: 'us-east-1',
    prefix: 'docs/',
    metadata: { owner: 'e2e' },
  });

  const first = await storage.upload(file);
  const second = await storage.upload(file);
  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: first.key }));
  const stored = Buffer.from(await object.Body.transformToByteArray());

  h.check(
    'S3: stored object is byte-exact',
    stored.equals(content),
    `${stored.length} bytes`,
  );
  h.check(
    'S3: ContentType stored',
    object.ContentType === 'application/pdf',
    object.ContentType,
  );
  h.check(
    'S3: ContentDisposition keeps the UTF-8 filename',
    object.ContentDisposition?.includes(UTF8_DISPOSITION),
    object.ContentDisposition,
  );
  h.check(
    'S3: metadata stored',
    object.Metadata?.owner === 'e2e',
    JSON.stringify(object.Metadata),
  );
  h.check(
    'S3: same file twice -> distinct keys',
    first.key !== second.key,
    `${first.key} / ${second.key}`,
  );
  h.check('S3: exists() true after upload', (await storage.exists(first.key)) === true);
  await storage.delete(first.key);
  h.check('S3: exists() false after delete', (await storage.exists(first.key)) === false);

  await h.attempt('S3: presigned URL downloads the object', async () => {
    const response = await fetch(await storage.getUrl(second.key, 60));
    return [
      response.status === 200 &&
        Buffer.from(await response.arrayBuffer()).equals(content),
      `status ${response.status}`,
    ];
  });

  try {
    await new S3Storage(s3, { bucket: `${RUN_ID}-missing`, region: 'us-east-1' }).upload(
      file,
    );
    h.check(
      'S3: SDK error mapped to a StorageError',
      false,
      'upload to a missing bucket succeeded',
    );
  } catch (error) {
    h.check(
      'S3: SDK error mapped to a StorageError',
      error.name === 'MultiPartError' &&
        error.statusCode === 404 &&
        error.filename === file.name,
      `${error.code} ${error.statusCode}`,
    );
  }
}

// ─────────────── Azure Blob ───────────────
if (!(await reachable(AZURE_ENDPOINT))) {
  unavailable('Azure', AZURE_ENDPOINT);
} else {
  const { BlobServiceClient } = await import('@azure/storage-blob');
  const { AzureBlobStorage, getAzureBlobSasUrl } =
    await import('@xkid1/multipart/storage/azure');

  // Azurite's well-known development account (public, documented by Microsoft).
  const accountName = 'devstoreaccount1';
  const accountKey =
    'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';
  const connection = `DefaultEndpointsProtocol=http;AccountName=${accountName};AccountKey=${accountKey};BlobEndpoint=${AZURE_ENDPOINT};`;
  const container =
    BlobServiceClient.fromConnectionString(connection).getContainerClient(RUN_ID);
  await container.create();
  const storage = new AzureBlobStorage(container, {
    accountName,
    container: RUN_ID,
    prefix: 'docs/',
  });

  const uploaded = await storage.upload(file);
  const blob = container.getBlockBlobClient(uploaded.name);
  const downloaded = await blob.downloadToBuffer();
  const properties = await blob.getProperties();

  h.check(
    'Azure: stored blob is byte-exact',
    downloaded.equals(content),
    `${downloaded.length} bytes`,
  );
  h.check(
    'Azure: etag returned matches the blob',
    uploaded.etag !== '' && uploaded.etag === properties.etag,
  );
  h.check(
    'Azure: content type + UTF-8 disposition stored',
    properties.contentType === 'application/pdf' &&
      properties.contentDisposition?.includes(UTF8_DISPOSITION),
    properties.contentDisposition,
  );
  h.check(
    'Azure: exists() true after upload',
    (await storage.exists(uploaded.name)) === true,
  );

  const sasUrl = getAzureBlobSasUrl(uploaded.name, container, accountKey);
  const read = await fetch(sasUrl);
  h.check(
    'Azure SAS (default): read works',
    read.status === 200 && Buffer.from(await read.arrayBuffer()).equals(content),
    `GET ${read.status}`,
  );
  const write = await fetch(sasUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob' },
    body: 'overwritten',
  });
  h.check(
    'Azure SAS (default): overwrite refused',
    write.status === 403,
    `PUT ${write.status}`,
  );
  const remove = await fetch(sasUrl, { method: 'DELETE' });
  h.check(
    'Azure SAS (default): delete refused',
    remove.status === 403,
    `DELETE ${remove.status}`,
  );

  await storage.delete(uploaded.name);
  h.check(
    'Azure: exists() false after delete',
    (await storage.exists(uploaded.name)) === false,
  );
  await container.delete();
}

h.done();
