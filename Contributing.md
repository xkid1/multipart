# Contributing to @xkid1/multipart

Thanks for helping! This guide covers how to report issues, set up the project, and get
a pull request merged.

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md). Please report
security issues privately, as described in [SECURITY.md](./SECURITY.md), not in issues.

## Reporting bugs and requesting features

Use the [issue forms](https://github.com/xkid1/multipart/issues/new/choose). They ask for
the details needed to reproduce a problem: package version, Node.js version, ESM or
CommonJS, framework, and a minimal code sample. Please search existing issues first.

Feature ideas that keep the core parser **dependency-free** and integrations **optional**
are the easiest to accept.

## Development setup

| Tool    | Version                                                                 |
| ------- | ----------------------------------------------------------------------- |
| Node.js | 26 for development (see `.nvmrc`); the package itself supports Node 18+ |
| Yarn    | 4.18.0 via Corepack (`corepack enable`)                                 |
| Docker  | only for the S3/Azure end-user tests and the Node.js version matrix     |

```bash
git clone https://github.com/xkid1/multipart.git
cd multipart
corepack enable
yarn install
git checkout -b fix/short-description
```

## Commands

| Command                    | What it does                                                               |
| -------------------------- | -------------------------------------------------------------------------- |
| `yarn test` / `test:watch` | unit tests (Vitest)                                                        |
| `yarn lint` / `lint:fix`   | ESLint                                                                     |
| `yarn typecheck`           | TypeScript, no emit                                                        |
| `yarn format`              | Prettier                                                                   |
| `yarn coverage`            | tests with coverage thresholds                                             |
| `yarn build`               | ESM + CommonJS builds and type declarations into `dist/`                   |
| `yarn check`               | all of the above, as the release job runs it                               |
| `yarn e2e`                 | packs the tarball and tests it as an end user ([details](./e2e/README.md)) |
| `yarn e2e:emulators up`    | starts S3 and Azure emulators (Docker) for the cloud scenarios             |
| `yarn e2e:matrix`          | end-user suite on Node 18–26, each in a container                          |

## Project layout

The source is organized in layers. Each layer has an `index.ts` barrel and a path alias:

```text
src/
├── index.ts             # public root entry
├── types/      @types   # type definitions only (no runtime code)
├── utils/      @utils   # header parsing, part iteration, encoding, errors, logger
├── libs/       @libs    # the parser (multipart, parseMultipartWithDuplicates), form helpers
├── middleware/ @middleware
│   ├── shared/          # framework-agnostic request reading and parsing
│   ├── express/         # → @xkid1/multipart/middleware/express
│   └── nestjs/          # → @xkid1/multipart/middleware/nestjs (imports @nestjs/common)
└── storage/    @storage
    ├── shared/          # filename sanitizing, object keys, errors
    ├── local/           # → @xkid1/multipart/storage/local
    ├── s3/              # → @xkid1/multipart/storage/s3 (imports @aws-sdk/client-s3)
    └── azure/           # → @xkid1/multipart/storage/azure (imports @azure/storage-blob)
e2e/                     # end-user tests against the packed tarball
```

Dependencies point downwards: `types` ← `utils` ← `libs` ← `middleware` / `storage`.
ESLint enforces the key boundaries: `types` contains no runtime code, and `storage` never
imports `middleware`.

## Coding guidelines

- **Imports.** Import other layers through their alias (`import { MultiPartError } from '@utils'`).
  Inside a layer, use relative imports without an extension (`'./form-parts'`). Never import
  your own layer's alias, because that creates a cycle. The build rewrites aliases to
  relative `.js` paths in the published output.
- **Optional dependencies stay optional.** Code that imports a framework or cloud SDK at
  runtime belongs in its own subpath, never in the root entry. Adding a runtime dependency
  needs maintainer approval.
- **Types.** TypeScript runs in `strict` mode. Avoid `any`, and give exported functions
  explicit types and JSDoc.
- **Errors.** Throw `MultiPartError` with a code from `MultiPartErrorCode` and a
  `statusCode`, so the middleware can map it to an HTTP response.
- **Untrusted input.** Everything in a request is attacker-controlled, including names,
  filenames, headers and sizes. Bound the work, and never use client values as paths.

## Tests

Every bug fix and behavior change needs a test. Bug fixes need a regression test that fails
without the fix.

- Unit tests sit next to the code (`*.test.ts`).
- Parser changes should also cover malformed input. `src/libs/multipart/regressions.test.ts`
  has helpers, including a round trip through Node's own `FormData` encoder.
- Changes to exports, packaging, middleware or storage should also pass `yarn e2e`, which
  tests the real tarball with Express 4/5, NestJS and the cloud SDKs.

```typescript
import { describe, expect, it } from 'vitest';

import { parseMultipartWithDuplicates } from './parse-multipart';

describe('parseMultipartWithDuplicates', () => {
  it('keeps every value of a repeated field', () => {
    const body = Buffer.from(
      '--b\r\nContent-Disposition: form-data; name="tag"\r\n\r\na\r\n' +
        '--b\r\nContent-Disposition: form-data; name="tag"\r\n\r\nb\r\n--b--\r\n',
    );
    expect(parseMultipartWithDuplicates(body, 'b').tag).toEqual(['a', 'b']);
  });
});
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
`refactor:`, `test:`, `docs:`, `chore:`, `ci:`. Mark breaking changes with `!`
(for example `feat!:`) and explain them in the body.

## Pull requests

1. Open the PR against `main` and fill in the template. Link the issue (`Fixes #123`).
2. These checks must pass before the PR can be merged:

   | Check       | Command                                |
   | ----------- | -------------------------------------- |
   | `Lint`      | `yarn lint`                            |
   | `Typecheck` | `yarn typecheck`                       |
   | `Test`      | `yarn test`                            |
   | `E2E`       | `yarn e2e` on Node 18–26, npm and pnpm |

   CI also runs `Format`, `Build` and CodeQL, so fix any findings they report.
3. Update `CHANGELOG.md` for user-visible changes, and the README for API changes.
4. A maintainer reviews and merges once checks pass and feedback is addressed.

## Releases

Maintainers release by bumping `version` in `package.json`, adding a matching
`## [x.y.z]` section to `CHANGELOG.md`, and pushing a `vx.y.z` tag:

```bash
git tag v0.2.0 && git push origin v0.2.0
```

The publish workflow then runs on its own: it re-runs `yarn check`, runs the end-user
suite (`e2e.yml`) on Node 18–26 and pnpm with the S3/Azure emulators, publishes that
exact tested tarball to npm (with provenance) and GitHub Packages, and creates the
GitHub release with generated notes. If any test fails, nothing is published. A version with a pre-release suffix
(`1.0.0-beta.1`) goes to the `next` dist-tag and becomes a GitHub pre-release.

If a run fails partway, re-run it (or run the workflow manually with the tag). Steps
whose version is already published are skipped.

Versions follow [Semantic Versioning](https://semver.org/). Before 1.0, a minor bump may
include breaking changes.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE).
