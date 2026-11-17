// Scenario: TypeScript consumers. Typechecks types-usage.ts under the module
// settings users actually have, with skipLibCheck off so errors inside our .d.ts surface.
import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';

import h from './_harness.cjs';

copyFileSync('types-usage.ts', 'types-usage.mts'); // same code, compiled as ESM

const base = {
  strict: true,
  noEmit: true,
  skipLibCheck: false,
  types: ['node'],
  esModuleInterop: true,
};
const configs = {
  'node16 + CommonJS (require)': {
    module: 'node16',
    moduleResolution: 'node16',
    file: 'types-usage.ts',
  },
  'node16 + ESM (import)': {
    module: 'node16',
    moduleResolution: 'node16',
    file: 'types-usage.mts',
  },
  'bundler (Vite, webpack, esbuild)': {
    module: 'esnext',
    moduleResolution: 'bundler',
    target: 'es2022',
    file: 'types-usage.ts',
  },
  'node10 (default NestJS tsconfig)': {
    module: 'commonjs',
    moduleResolution: 'node10',
    target: 'es2022',
    file: 'types-usage.ts',
  },
  'old lib target (ES2019)': {
    module: 'commonjs',
    moduleResolution: 'node10',
    target: 'es2019',
    lib: ['es2019'],
    file: 'types-usage.ts',
  },
};

const tsVersion = spawnSync(
  process.execPath,
  ['node_modules/typescript/bin/tsc', '--version'],
  { encoding: 'utf8' },
).stdout.trim();

for (const [label, { file, ...options }] of Object.entries(configs)) {
  const configFile = `tsconfig.e2e-${label.replace(/\W+/g, '-')}.json`;
  writeFileSync(
    configFile,
    JSON.stringify({ compilerOptions: { ...base, ...options }, files: [file] }),
  );
  const result = spawnSync(
    process.execPath,
    ['node_modules/typescript/bin/tsc', '-p', configFile],
    { encoding: 'utf8' },
  );
  const errors = (result.stdout + result.stderr).trim();
  h.check(
    `types compile: ${label}`,
    result.status === 0,
    result.status === 0 ? tsVersion : errors.split('\n').slice(0, 3).join(' | '),
  );
}

h.done();
