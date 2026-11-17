// Scenario: `npm install @xkid1/multipart` alone, with no SDKs or frameworks.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import h from './_harness.cjs';

const require = createRequire(import.meta.url);

// 1. Nothing but the package itself was installed.
const installed = readdirSync('node_modules').filter((entry) => !entry.startsWith('.'));
h.check(
  'installs zero dependencies',
  installed.length === 1 && installed[0] === '@xkid1',
  installed.join(', '),
);

const manifest = JSON.parse(
  readFileSync('node_modules/@xkid1/multipart/package.json', 'utf8'),
);
h.check(
  'package declares no runtime dependencies',
  !manifest.dependencies && !manifest.optionalDependencies,
  JSON.stringify(manifest.optionalDependencies ?? manifest.dependencies ?? {}),
);
for (const sdk of [
  'express',
  '@nestjs/common',
  '@aws-sdk/client-s3',
  '@azure/storage-blob',
]) {
  h.check(
    `optional peer ${sdk} is not auto-installed`,
    manifest.peerDependenciesMeta?.[sdk]?.optional === true,
  );
}

// 2. Entry points that need no SDK work, in both module systems.
for (const subpath of ['', '/storage/local', '/middleware/express']) {
  const id = `@xkid1/multipart${subpath}`;
  await h.attempt(
    `import ${id} without any SDK installed`,
    async () => Object.keys(await import(id)).length > 0,
  );
  await h.attempt(
    `require ${id} without any SDK installed`,
    () => Object.keys(require(id)).length > 0,
  );
}

const { multipart } = await import('@xkid1/multipart');
const form = new FormData();
form.append('greeting', 'hello');
const { body, boundary } = await h.encodeForm(form);
h.check(
  'core parser works with nothing else installed',
  multipart(body, boundary).greeting === 'hello',
);

// 3. Subpaths that need an SDK fail clearly, naming the missing package.
for (const [subpath, sdk] of [
  ['/storage/s3', '@aws-sdk/client-s3'],
  ['/storage/azure', '@azure/storage-blob'],
  ['/middleware/nestjs', '@nestjs/common'],
]) {
  const id = `@xkid1/multipart${subpath}`;
  try {
    await import(id);
    h.check(`${id} without ${sdk}: clear error`, false, 'imported without error');
  } catch (error) {
    h.check(
      `${id} without ${sdk}: clear error`,
      error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes(sdk),
      error.message.split('\n')[0],
    );
  }
}

h.done();
