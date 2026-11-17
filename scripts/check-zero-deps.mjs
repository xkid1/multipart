// Guard the "zero runtime dependencies" promise.
//
// Fails when package.json declares anything an end user would install
// automatically (dependencies, optionalDependencies, bundleDependencies), and
// when a peer dependency is not optional or is missing from devDependencies
// (CI installs peers through devDependencies; see .github/CI_BUILD_STRATEGY.md).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

const errors = [];

for (const field of [
  'dependencies',
  'optionalDependencies',
  'bundleDependencies',
  'bundledDependencies',
]) {
  const value = pkg[field];
  const names = Array.isArray(value) ? value : Object.keys(value ?? {});
  if (names.length > 0) {
    errors.push(`"${field}" must be empty, found: ${names.join(', ')}`);
  }
}

const peers = Object.keys(pkg.peerDependencies ?? {});
const meta = pkg.peerDependenciesMeta ?? {};
const dev = pkg.devDependencies ?? {};

for (const name of peers) {
  if (meta[name]?.optional !== true) {
    errors.push(`peer "${name}" must be marked optional in "peerDependenciesMeta"`);
  }
  if (!(name in dev)) {
    errors.push(
      `peer "${name}" must also be a devDependency so CI can build and test it`,
    );
  }
}

if (errors.length > 0) {
  throw new Error(
    'Zero-dependency check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'),
  );
}

console.log(
  `Zero-dependency check passed: no runtime dependencies, ${peers.length} optional peers.`,
);
