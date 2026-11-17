# CI Build Strategy: Optional Peer Dependencies

The core parser has **zero runtime dependencies**. Framework and storage integrations
use SDKs that the _application_ installs:

| Integration              | Peer dependency (optional)                                   |
| ------------------------ | ------------------------------------------------------------ |
| Express middleware       | `express` (types only; no runtime import)                    |
| NestJS middleware        | `@nestjs/common`                                             |
| AWS S3 storage           | `@aws-sdk/client-s3` (+ `@aws-sdk/s3-request-presigner` for presigned URLs) |
| Azure Blob storage       | `@azure/storage-blob`                                        |
| Local storage, parser    | none                                                         |

## How CI gets these packages

Every peer is also a **devDependency**, pinned in `yarn.lock`. CI runs a plain
`yarn install --immutable` (see `.github/actions/setup/action.yml`), so:

- tests, type-checking and builds run against the **real** SDK types and APIs;
- `package.json` is never modified in CI. That matters because the publish job
  publishes the working tree: an earlier `yarn add --optional ...` step in the
  setup action wrote all SDKs into `optionalDependencies`, which would have
  made every consumer download them.

Consumers only get the `peerDependencies` + `peerDependenciesMeta.optional`
entries, so npm never installs an SDK the application didn't ask for.

## Adding a new integration

1. Add the SDK to `devDependencies` **and** to `peerDependencies`, marked optional in
   `peerDependenciesMeta`.
2. Expose it from its own subpath in `exports` (and `typesVersions`), never from the
   root entry, so apps that don't use it never load it.
3. Run `yarn install` to update `yarn.lock` (CI's `--immutable` install fails otherwise).

## Build output

`yarn build` produces a dual package:

- `dist/esm` — ES modules (`import`)
- `dist/cjs` — CommonJS (`require`, e.g. NestJS projects compiled to CommonJS)

Each has its own `.d.ts` files, so TypeScript resolves the correct format under
`node16`/`nodenext`, `bundler` and legacy `node10` resolution.

## Local validation

```bash
yarn check                       # format, lint, typecheck, tests + coverage, build
bash scripts/smoke-consumer.sh   # the packed-consumer check the publish job runs
```
