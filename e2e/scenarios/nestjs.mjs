// Scenario: NestJS. Compiles nestjs-app.ts the way a default Nest project does, then runs it.
import { spawnSync } from 'node:child_process';

import h from './_harness.cjs';

if (h.nodeMajor < 20) {
  h.skip(
    'NestJS scenario',
    `NestJS 11 requires Node 20+, this is Node ${process.versions.node}`,
  );
  process.exit(0);
}

const tsc = spawnSync(
  process.execPath,
  [
    'node_modules/typescript/bin/tsc',
    'nestjs-app.ts',
    '--outDir',
    'out-nest',
    '--module',
    'commonjs',
    '--moduleResolution',
    'node10',
    '--target',
    'es2022',
    '--experimentalDecorators',
    '--emitDecoratorMetadata',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strict',
    '--types',
    'node',
    '--noEmitOnError',
  ],
  { encoding: 'utf8' },
);
const compiled = h.check(
  'Nest app compiles (CommonJS, decorators, node10 resolution)',
  tsc.status === 0,
  (tsc.stdout + tsc.stderr).trim().split('\n')[0],
);

if (compiled) {
  // The compiled app needs the harness next to it.
  const { copyFileSync } = await import('node:fs');
  copyFileSync('_harness.cjs', 'out-nest/_harness.cjs');
  const app = spawnSync(process.execPath, ['out-nest/nestjs-app.js'], {
    stdio: 'inherit',
    timeout: 60_000,
  });
  if (app.status !== 0) process.exitCode = 1;
}

h.done();
