// Finalize the dual ESM/CJS build.
//
// - Marks dist/cjs as CommonJS (the package root is "type": "module").
// - Copies the declaration files emitted into dist/esm to dist/cjs, so the
//   "require" export condition gets declarations that TypeScript treats as CJS.
import { cpSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(import.meta.dirname, '..', 'dist');

writeFileSync(
  path.join(dist, 'cjs', 'package.json'),
  `${JSON.stringify({ type: 'commonjs' })}\n`,
);

cpSync(path.join(dist, 'esm'), path.join(dist, 'cjs'), {
  recursive: true,
  filter: (source) => !source.endsWith('.js') && !source.endsWith('.js.map'),
});

console.log(
  'Build finalized: dist/esm (ESM) and dist/cjs (CommonJS), with type declarations.',
);
