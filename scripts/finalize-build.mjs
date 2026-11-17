// Finalize the dual ESM/CJS build.
//
// 1. Rewrite import specifiers in the emitted .d.ts files. `tsc` keeps them as
//    written in the source, but consumers can resolve neither our path aliases
//    (`@types`, `@utils`, ...) nor extensionless relative paths (node16/nodenext):
//      '@utils'            -> '../../utils/index.js'
//      './form-parts'      -> './form-parts.js'
//      './storage/local'   -> './storage/local/index.js'
//    (swc already does this for the JavaScript output, via .swcrc `paths`.)
// 2. Mark dist/cjs as CommonJS (the package root is "type": "module").
// 3. Copy the declarations into dist/cjs, so the "require" export condition gets
//    declarations that TypeScript treats as CommonJS.
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const esm = path.join(dist, 'esm');

// Aliases come from tsconfig.json, so there is a single source of truth.
const tsconfig = JSON.parse(
  readFileSync(path.join(root, 'tsconfig.json'), 'utf8').replace(
    /^\s*\/\*.*\*\/\s*$/gm,
    '',
  ),
);
/** @type {Record<string, string>} */
const aliases = Object.fromEntries(
  Object.entries(
    /** @type {Record<string, string[]>} */ (tsconfig.compilerOptions.paths),
  ).map(([alias, [target]]) => [
    alias,
    // ./src/utils/index.ts -> <dist/esm>/utils/index
    path.join(esm, path.relative('src', target).replace(/\.ts$/, '')),
  ]),
);

/** @type {(dir: string) => string[]} */
const declarationFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return declarationFiles(full);
    return entry.name.endsWith('.d.ts') ? [full] : [];
  });

/** @type {(fromFile: string, targetWithoutExt: string) => string} */
const toRelative = (fromFile, targetWithoutExt) => {
  const relative = path
    .relative(path.dirname(fromFile), targetWithoutExt)
    .split(path.sep)
    .join('/');
  return `${relative.startsWith('.') ? relative : `./${relative}`}.js`;
};

/** @type {(file: string, specifier: string) => string} */
const resolveSpecifier = (file, specifier) => {
  if (specifier in aliases) return toRelative(file, aliases[specifier]);
  if (!specifier.startsWith('.') || specifier.endsWith('.js')) return specifier;

  const target = path.resolve(path.dirname(file), specifier);
  if (existsSync(`${target}.d.ts`)) return toRelative(file, target);
  if (existsSync(target) && statSync(target).isDirectory())
    return toRelative(file, path.join(target, 'index'));
  throw new Error(`Cannot resolve "${specifier}" in ${path.relative(root, file)}`);
};

// `from '...'`, `import '...'` and `import('...')` (inline type references).
// `from` must be followed by whitespace, so calls like `Buffer.from('...')` in
// JSDoc examples don't match.
const SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"]+)\2/g;
let rewritten = 0;
for (const file of declarationFiles(esm)) {
  const source = readFileSync(file, 'utf8');
  const updated = source.replace(
    SPECIFIER,
    (
      /** @type {string} */ _match,
      /** @type {string} */ prefix,
      /** @type {string} */ quote,
      /** @type {string} */ specifier,
    ) => `${prefix}${quote}${resolveSpecifier(file, specifier)}${quote}`,
  );
  if (updated !== source) {
    writeFileSync(file, updated);
    rewritten++;
  }
}

writeFileSync(
  path.join(dist, 'cjs', 'package.json'),
  `${JSON.stringify({ type: 'commonjs' })}\n`,
);
cpSync(esm, path.join(dist, 'cjs'), {
  recursive: true,
  filter: (source) => !source.endsWith('.js') && !source.endsWith('.js.map'),
});

console.log(
  `Build finalized: rewrote imports in ${rewritten} declaration files; dist/esm + dist/cjs ready.`,
);
