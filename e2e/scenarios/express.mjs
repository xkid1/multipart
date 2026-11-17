// Scenario: Express app. Usage: node express.mjs <express-module>  (e.g. express, express4)
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  multipartErrorHandler,
  multipartExpress,
} from '@xkid1/multipart/middleware/express';
import { LocalStorage } from '@xkid1/multipart/storage/local';

import h from './_harness.cjs';

const moduleName = process.argv[2] ?? 'express';
const express = (await import(moduleName)).default;
const version = createRequire(import.meta.url)(`${moduleName}/package.json`).version;
const tag = `[express ${version}]`;

const directory = await mkdtemp(path.join(os.tmpdir(), 'e2e-express-'));
const storage = new LocalStorage({ directory, prefix: 'avatars' });

const app = express();
app.post(
  '/upload',
  multipartExpress({ maxSize: 5 * 1024 * 1024 }),
  async (req, res, next) => {
    try {
      if (req.multipartError)
        return res.status(req.multipartError.statusCode).json(req.multipartError);
      const saved = await storage.upload(req.files.photo);
      res.json({
        fields: req.fields,
        size: req.files.photo.size,
        path: saved.path,
        abs: saved.absolutePath,
      });
    } catch (error) {
      next(error);
    }
  },
);
app.post(
  '/strict',
  multipartExpress({ onError: 'next', maxFiles: 1, allowedMimeTypes: ['image/*'] }),
  (req, res) => res.json({ ok: true, files: Object.keys(req.files ?? {}) }),
);
// Routes that must keep working alongside the middleware:
app.post('/json', express.json(), multipartExpress(), (req, res) => res.json(req.body));
app.use(multipartErrorHandler);

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (route, form) => fetch(`${base}${route}`, { method: 'POST', body: form });

try {
  const binary = Buffer.concat([randomBytes(1024 * 1024), Buffer.from('\r\n--\r\n')]);

  await h.attempt(`${tag} 1 MiB upload is byte-exact on disk`, async () => {
    const form = new FormData();
    form.append('user', ' Ada ');
    form.append('tags', 'a');
    form.append('tags', 'b');
    form.append('photo', new Blob([binary], { type: 'image/png' }), 'me.png');
    const json = await (await post('/upload', form)).json();
    const onDisk = await readFile(json.abs);
    return [onDisk.equals(binary) && json.size === binary.length, json.path];
  });

  await h.attempt(
    `${tag} fields keep whitespace; repeated names become arrays`,
    async () => {
      const form = new FormData();
      form.append('user', ' Ada ');
      form.append('tags', 'a');
      form.append('tags', 'b');
      form.append('photo', new Blob(['x'], { type: 'image/png' }), 'x.png');
      const { fields } = await (await post('/upload', form)).json();
      return [
        fields.user === ' Ada ' && JSON.stringify(fields.tags) === '["a","b"]',
        JSON.stringify(fields),
      ];
    },
  );

  await h.attempt(`${tag} same filename again is not overwritten`, async () => {
    const form = new FormData();
    form.append('photo', new Blob(['second'], { type: 'image/png' }), 'me.png');
    const json = await (await post('/upload', form)).json();
    return [json.path === 'avatars/me-1.png', json.path];
  });

  await h.attempt(`${tag} body over maxSize -> 413 delivered`, async () => {
    const form = new FormData();
    form.append('photo', new Blob([randomBytes(6 * 1024 * 1024)]), 'big.bin');
    const res = await post('/upload', form);
    return [
      res.status === 413 && (await res.json()).code === 'LIMIT_BODY_SIZE',
      `status ${res.status}`,
    ];
  });

  await h.attempt(`${tag} onError 'next' + multipartErrorHandler -> 413`, async () => {
    const form = new FormData();
    form.append('a', new Blob(['1'], { type: 'image/png' }), 'a.png');
    form.append('b', new Blob(['2'], { type: 'image/png' }), 'b.png');
    const res = await post('/strict', form);
    return [
      res.status === 413 && (await res.json()).error.code === 'LIMIT_FILES',
      `status ${res.status}`,
    ];
  });

  await h.attempt(`${tag} disallowed MIME type -> 415`, async () => {
    const form = new FormData();
    form.append('a', new Blob(['MZ'], { type: 'application/x-msdownload' }), 'a.exe');
    const res = await post('/strict', form);
    return [res.status === 415, `status ${res.status}`];
  });

  await h.attempt(`${tag} JSON requests unaffected by the middleware`, async () => {
    const res = await fetch(`${base}/json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'world' }),
    });
    return [(await res.json()).hello === 'world', `status ${res.status}`];
  });

  await h.attempt(`${tag} server healthy after error cases`, async () => {
    const form = new FormData();
    form.append('a', new Blob(['1'], { type: 'image/png' }), 'a.png');
    return (await post('/strict', form)).status === 200;
  });
} finally {
  server.close();
  await rm(directory, { recursive: true, force: true });
}

h.done();
