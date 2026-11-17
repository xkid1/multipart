// A NestJS 11 app using the middleware, compiled like a default `nest new` project
// (CommonJS, decorators, node10 module resolution). Run via nestjs.mjs.
import 'reflect-metadata';
import { randomBytes } from 'node:crypto';

import {
  Controller,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
  Req,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { FileData } from '@xkid1/multipart';
import {
  createMultipartNestjs,
  MultipartNestjs,
  multipartNestjs,
} from '@xkid1/multipart/middleware/nestjs';
import type { Request } from 'express';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const h = require('./_harness.cjs');

@Controller()
class UploadController {
  @Post(['default', 'configured', 'functional'])
  upload(@Req() req: Request) {
    const doc = req.files?.doc as FileData | undefined;
    return { fields: req.fields, sha: doc && h.sha256(doc.buffer), size: doc?.size };
  }
}

@Module({ controllers: [UploadController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MultipartNestjs).forRoutes('default');
    consumer
      .apply(
        createMultipartNestjs({ maxFiles: 1, allowedMimeTypes: ['application/pdf'] }),
      )
      .forRoutes('configured');
    consumer.apply(multipartNestjs({ maxSize: 1024 })).forRoutes('functional');
  }
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const post = (route: string, form: FormData) =>
    fetch(`${base}/${route}`, { method: 'POST', body: form });

  try {
    const pdf = Buffer.concat([Buffer.from('%PDF-1.7\r\n'), randomBytes(256 * 1024)]);
    const form = new FormData();
    form.append('title', 'Quarterly');
    form.append('doc', new Blob([pdf], { type: 'application/pdf' }), 'report.pdf');

    await h.attempt(
      'apply(MultipartNestjs): binary upload byte-exact, fields parsed',
      async () => {
        const res = await post('default', form);
        const json = await res.json();
        return [
          res.status === 201 &&
            json.sha === h.sha256(pdf) &&
            json.fields.title === 'Quarterly',
          `status ${res.status}`,
        ];
      },
    );

    await h.attempt(
      'createMultipartNestjs(options): accepts a valid upload',
      async () => {
        const res = await post('configured', form);
        return [res.status === 201, `status ${res.status}`];
      },
    );

    await h.attempt(
      'createMultipartNestjs: too many files -> 413 with error code',
      async () => {
        const two = new FormData();
        two.append('a', new Blob(['1'], { type: 'application/pdf' }), 'a.pdf');
        two.append('b', new Blob(['2'], { type: 'application/pdf' }), 'b.pdf');
        const res = await post('configured', two);
        const json = await res.json();
        return [
          res.status === 413 && json.error === 'LIMIT_FILES',
          `status ${res.status} ${json.error}`,
        ];
      },
    );

    await h.attempt('createMultipartNestjs: disallowed MIME -> 415', async () => {
      const png = new FormData();
      png.append('doc', new Blob(['x'], { type: 'image/png' }), 'x.png');
      const res = await post('configured', png);
      return [res.status === 415, `status ${res.status}`];
    });

    await h.attempt('multipartNestjs(fn): maxSize -> 413 delivered', async () => {
      const big = new FormData();
      big.append('doc', new Blob([randomBytes(4096)]), 'big.bin');
      const res = await post('functional', big);
      return [res.status === 413, `status ${res.status}`];
    });
  } finally {
    await app.close();
    h.done();
  }
}

void main();
