#!/usr/bin/env node
// End-user test suite for @xkid1/multipart.
//
// Packs the package exactly as `npm publish` would, installs the tarball into a
// fresh project outside this repository, and runs real usage scenarios against it.
//
//   node e2e/run.mjs                     pack + run everything with npm
//   node e2e/run.mjs --pm pnpm           install with pnpm instead
//   node e2e/run.mjs --tarball x.tgz     test an existing tarball (skips packing)
//   node e2e/run.mjs --only express,types
//   node e2e/run.mjs --keep              keep the consumer project for inspection
//
// Cloud scenarios need the emulators (bash e2e/emulators.sh up); without them they
// are skipped, or fail when E2E_REQUIRE_CLOUD=1.
//
// Written for Node 18+ (the package's minimum), so no newer-only APIs here.
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

const { values: options } = parseArgs({
  options: {
    tarball: { type: 'string' },
    pm: { type: 'string', default: 'npm' },
    only: { type: 'string' },
    keep: { type: 'boolean', default: false },
  },
});

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const STATUS_COLOR = { PASS: 32, FAIL: 31, SKIP: 33 };

const run = (command, args, opts = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0 && !opts.allowFailure) {
    console.error(paint(31, `\n✖ ${command} ${args.join(' ')} failed`));
    console.error(result.stdout, result.stderr);
    process.exit(1);
  }
  return result;
};

const installers = {
  npm: (specs, dev) => [
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--loglevel=error',
      ...(dev ? ['--save-dev'] : []),
      ...specs,
    ],
  ],
  pnpm: (specs, dev) => [
    'pnpm',
    ['add', '--reporter=silent', ...(dev ? ['--save-dev'] : []), ...specs],
  ],
};
const install = installers[options.pm];
if (!install) {
  console.error(`Unknown --pm ${options.pm}; use npm or pnpm`);
  process.exit(1);
}

// ─────────────── 1. The tarball ───────────────
const work = mkdtempSync(path.join(os.tmpdir(), 'xkid1-multipart-e2e-'));
let tarball = options.tarball && path.resolve(options.tarball);
if (!tarball) {
  console.log(paint(36, '▸ Packing with `npm pack` (runs prepack → yarn build)...'));
  const packed = run('npm', ['pack', '--pack-destination', work, '--loglevel=error'], {
    cwd: repoRoot,
  });
  tarball = path.join(work, packed.stdout.trim().split('\n').pop());
}
console.log(
  paint(
    36,
    `▸ Testing ${path.basename(tarball)} on Node ${process.versions.node} with ${options.pm}`,
  ),
);

// ─────────────── 2. A fresh consumer project ───────────────
const consumer = path.join(work, 'consumer-app');
mkdirSync(consumer);
writeFileSync(
  path.join(consumer, 'package.json'),
  JSON.stringify({ name: 'consumer-app', version: '1.0.0', private: true }, null, 2),
);
for (const file of readdirSync(path.join(here, 'scenarios'))) {
  copyFileSync(path.join(here, 'scenarios', file), path.join(consumer, file));
}
const inConsumer = { cwd: consumer, env: { ...process.env, NO_COLOR: '1' } };

// ─────────────── 3. Scenarios ───────────────
const node = (file, ...args) => [process.execPath, [file, ...args]];
const SCENARIOS = [
  {
    id: 'install',
    title: 'Install with no SDKs (zero dependencies)',
    cmd: node('install.mjs'),
    phase: 'core-only',
  },
  {
    id: 'exports',
    title: 'CommonJS require() of every subpath',
    cmd: node('exports.cjs'),
  },
  { id: 'exports', title: 'ESM import of every subpath', cmd: node('exports.mjs') },
  { id: 'types', title: 'TypeScript consumers', cmd: node('types.mjs') },
  {
    id: 'node',
    title: 'Plain Node.js http server + local storage',
    cmd: node('node-http.mjs'),
  },
  { id: 'express', title: 'Express 5', cmd: node('express.mjs', 'express') },
  { id: 'express', title: 'Express 4', cmd: node('express.mjs', 'express4') },
  {
    id: 'nestjs',
    title: 'NestJS 11 (CommonJS build, as `nest new` compiles)',
    cmd: node('nestjs.mjs'),
  },
  {
    id: 'cloud',
    title: 'AWS S3 + Azure Blob (real SDKs, local emulators)',
    cmd: node('cloud.mjs'),
  },
];
const only = options.only?.split(',');
const selected = SCENARIOS.filter((s) => !only || only.includes(s.id));

const summary = [];
const runScenario = (scenario) => {
  console.log(`\n${paint(1, `■ ${scenario.title}`)}`);
  const [command, args] = scenario.cmd;
  const result = spawnSync(command, args, {
    ...inConsumer,
    encoding: 'utf8',
    timeout: 180_000,
  });
  const lines = `${result.stdout}${result.stderr}`.split('\n').filter(Boolean);
  const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
  for (const line of lines) {
    const status = line.slice(0, 4);
    if (status in counts) {
      counts[status]++;
      console.log(`  ${paint(STATUS_COLOR[status], status)}${line.slice(4)}`);
    } else {
      console.log(paint(90, `  │ ${line}`));
    }
  }
  // A crash or timeout with no FAIL line still counts as a failure.
  if (result.status !== 0 && counts.FAIL === 0) {
    counts.FAIL++;
    console.log(
      `  ${paint(31, 'FAIL')}  scenario exited with ${result.signal ?? `code ${result.status}`}`,
    );
  }
  summary.push({ title: scenario.title, ...counts });
};

console.log(paint(36, `▸ Installing ${path.basename(tarball)} alone...`));
run(...install([tarball]), inConsumer);
selected.filter((s) => s.phase === 'core-only').forEach(runScenario);

const remaining = selected.filter((s) => s.phase !== 'core-only');
if (remaining.length > 0) {
  const deps = JSON.parse(readFileSync(path.join(here, 'consumer-deps.json'), 'utf8'));
  console.log(paint(36, '\n▸ Installing frameworks and SDKs a typical app uses...'));
  run(...install(deps.dependencies, false), inConsumer);
  run(...install(deps.devDependencies, true), inConsumer);
  remaining.forEach(runScenario);
}

// ─────────────── 4. Summary ───────────────
const total = summary.reduce(
  (acc, s) => ({
    PASS: acc.PASS + s.PASS,
    FAIL: acc.FAIL + s.FAIL,
    SKIP: acc.SKIP + s.SKIP,
  }),
  { PASS: 0, FAIL: 0, SKIP: 0 },
);
console.log(`\n${paint(1, `Summary — Node ${process.versions.node}, ${options.pm}`)}`);
for (const s of summary) {
  const status =
    s.FAIL > 0 ? paint(31, 'FAIL') : s.PASS === 0 ? paint(33, 'SKIP') : paint(32, 'PASS');
  console.log(
    `  ${status}  ${s.title.padEnd(52)} ${s.PASS} passed${s.FAIL ? `, ${s.FAIL} failed` : ''}${s.SKIP ? `, ${s.SKIP} skipped` : ''}`,
  );
}
console.log(`  ${total.PASS} passed, ${total.FAIL} failed, ${total.SKIP} skipped`);

if (options.keep) console.log(paint(90, `\nConsumer project kept at ${consumer}`));
else rmSync(work, { recursive: true, force: true });

process.exit(total.FAIL > 0 ? 1 : 0);
