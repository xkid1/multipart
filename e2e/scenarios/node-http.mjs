// Scenario: plain Node.js `http` server (no framework) + local storage.
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { LocalStorage, MultiPartError, parseMultipartRequest } from '@xkid1/multipart';

import h from './_harness.cjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'e2e-node-http-'));
const storage = new LocalStorage({ directory, prefix: 'uploads' });
const requestErrors = [];

const server = http.createServer(async (req, res) => {
  const reply = (status, body) => {
    res
      .writeHead(status, { 'content-type': 'application/json' })
      .end(JSON.stringify(body));
  };
  try {
    const parsed = await parseMultipartRequest(req, {
      maxSize: 2 * 1024 * 1024,
      maxFiles: 3,
    });
    if (!parsed) return reply(415, { error: 'expected multipart/form-data' });
    const saved = [];
    for (const file of Object.values(parsed.files).flat())
      saved.push(await storage.upload(file));
    reply(200, {
      fields: parsed.fields,
      saved: saved.map((s) => ({ path: s.path, abs: s.absolutePath, size: s.size })),
    });
  } catch (error) {
    if (error instanceof MultiPartError && error.code === 'REQUEST_ERROR')
      requestErrors.push(error);
    if (!res.headersSent && !res.destroyed) {
      reply(error.statusCode ?? 500, { code: error.code, message: error.message });
    }
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (form) => fetch(base, { method: 'POST', body: form });

try {
  await h.attempt('binary file is byte-exact on disk', async () => {
    const binary = Buffer.concat([randomBytes(256 * 1024), Buffer.from('\r\n--\r\n')]);
    const form = new FormData();
    form.append('title', '  keeps  spaces ');
    form.append(
      'file',
      new Blob([binary], { type: 'application/octet-stream' }),
      'data.bin',
    );
    const json = await (await post(form)).json();
    const onDisk = await readFile(json.saved[0].abs);
    return [
      onDisk.equals(binary) && json.fields.title === '  keeps  spaces ',
      json.saved[0].path,
    ];
  });

  await h.attempt('non-multipart request is reported as not multipart', async () => {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    return [res.status === 415, `status ${res.status}`];
  });

  await h.attempt('body over maxSize -> 413 reaches the client', async () => {
    const form = new FormData();
    form.append('file', new Blob([randomBytes(3 * 1024 * 1024)]), 'big.bin');
    const res = await post(form);
    const json = await res.json();
    return [
      res.status === 413 && json.code === 'LIMIT_BODY_SIZE',
      `status ${res.status} ${json.code}`,
    ];
  });

  await h.attempt('too many files -> 413 LIMIT_FILES', async () => {
    const form = new FormData();
    for (let i = 0; i < 4; i++) form.append('f', new Blob([String(i)]), `${i}.txt`);
    const res = await post(form);
    return [
      res.status === 413 && (await res.json()).code === 'LIMIT_FILES',
      `status ${res.status}`,
    ];
  });

  await h.attempt(
    'client disconnect mid-upload rejects (no hang, no crash)',
    async () => {
      const before = requestErrors.length;
      const req = http.request(base, {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data; boundary=x',
          'content-length': '100000',
        },
      });
      req.on('error', () => {});
      req.write('--x\r\nContent-Disposition: form-data; name="a"\r\n\r\npartial');
      await new Promise((resolve) => setTimeout(resolve, 100));
      req.destroy();
      for (
        let waited = 0;
        waited < 3000 && requestErrors.length === before;
        waited += 50
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return [requestErrors.length > before, requestErrors.at(-1)?.message];
    },
  );

  await h.attempt('20 concurrent uploads of the same filename all survive', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => {
        const form = new FormData();
        form.append('file', new Blob([`content-${i}`]), 'same.txt');
        return (await post(form)).json();
      }),
    );
    const files = responses.map((r) => r.saved[0]);
    const contents = await Promise.all(files.map((f) => readFile(f.abs, 'utf8')));
    const unique = new Set(files.map((f) => f.path)).size;
    const allPresent =
      contents.sort().join() ===
      Array.from({ length: 20 }, (_, i) => `content-${i}`)
        .sort()
        .join();
    return [unique === 20 && allPresent, `${unique} distinct paths`];
  });

  await h.attempt('server still healthy after error cases', async () => {
    const form = new FormData();
    form.append('a', 'b');
    return (await post(form)).status === 200;
  });
} finally {
  server.close();
  await rm(directory, { recursive: true, force: true });
}

h.done();
