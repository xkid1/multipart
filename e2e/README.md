# End-user tests

These tests check the package **the way users receive it**. Unit tests in `src/`
import the source directly; this suite never does.

1. `npm pack` builds the tarball, the same artifact `npm publish` uploads.
2. The tarball is installed into a fresh project in the OS temp directory, so nothing
   can resolve from this repository's `node_modules`.
3. Real apps run against it and make real HTTP requests.

## Running

```bash
yarn e2e                         # everything except cloud (cloud is skipped without emulators)

yarn e2e:emulators up            # start S3Mock (:19090) and Azurite (:20000) in Docker
E2E_REQUIRE_CLOUD=1 yarn e2e     # everything, cloud required
yarn e2e:emulators down

yarn e2e:matrix                  # every supported Node version, each in a node:<v> container
```

Options for `node e2e/run.mjs`:

| Option            | Effect                                                         |
| ----------------- | -------------------------------------------------------------- |
| `--pm pnpm`       | install with pnpm instead of npm (stricter `node_modules`)     |
| `--tarball x.tgz` | test an existing tarball instead of packing                    |
| `--only a,b`      | run some scenarios: `install exports types node express nestjs cloud` |
| `--keep`          | keep the temporary consumer project and print its path         |

`E2E_NODE_VERSIONS="22 24"` and `E2E_PM=pnpm` configure `yarn e2e:matrix`.

## Scenarios

| Scenario   | What a user would do                                                         | Checks                                                                                                          |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `install`  | `npm install @xkid1/multipart` alone                                         | zero dependencies installed; SDK-free entry points work; SDK subpaths fail with an error naming the missing SDK |
| `exports`  | `require()` / `import` every subpath                                         | each resolves to the CJS or ESM build and exposes its API                                                       |
| `types`    | compile a TypeScript app                                                     | `node16` CJS and ESM, `bundler`, `node10` (default NestJS) and an ES2019 `lib`, with `skipLibCheck: false`      |
| `node`     | plain `http.createServer` + `parseMultipartRequest` + `LocalStorage`         | byte-exact files on disk; 413s reach the client; client disconnects; 20 concurrent same-name uploads            |
| `express`  | Express **5 and 4** apps                                                     | uploads, repeated fields, no overwrite, 413/415, `onError: 'next'`, JSON routes unaffected                      |
| `nestjs`   | NestJS 11 app compiled like `nest new` (CommonJS, decorators)                | `apply(MultipartNestjs)`, `createMultipartNestjs`, `multipartNestjs`, 413/415 responses                         |
| `cloud`    | real `@aws-sdk/client-s3` and `@azure/storage-blob` clients                  | byte-exact objects, content type/disposition, unique keys, exists/delete, presigned URLs, read-only SAS default |

Framework and SDK versions come from [`consumer-deps.json`](./consumer-deps.json). They
are ranges, so the suite also catches breakage from new releases of those packages.

## Adding a scenario

1. Add `scenarios/<name>.mjs` (or `.cjs`). It runs with the consumer project as its
   working directory, so `import '@xkid1/multipart'` resolves to the installed tarball.
2. Report with the helpers in `scenarios/_harness.cjs` (`check`, `attempt`, `skip`), and
   end with `h.done()`.
3. Register it in the `SCENARIOS` list in `run.mjs`.

The scenarios are plain JavaScript, written for the oldest supported Node (18).
