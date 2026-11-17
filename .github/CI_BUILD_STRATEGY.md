# CI Build Strategy: Optional Peer Dependencies

The core parser has **zero runtime dependencies**. Framework and storage integrations
use SDKs that the _application_ installs:

| Integration              | Peer dependency (optional)                                   |
| ------------------------ | ------------------------------------------------------------ |
| Express middleware       | `express` (types only; no runtime import)                    |
| NestJS middleware        | `@nestjs/common` (+ its own peers `reflect-metadata`, `rxjs`) |
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

`yarn check:deps` (`scripts/check-zero-deps.mjs`, run by the `Package` check) fails
if `dependencies`, `optionalDependencies` or `bundleDependencies` ever gets an
entry, or if a peer is not optional or not also a devDependency.

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

### Import aliases

Source files import other layers through the `tsconfig.json` aliases (`@types`,
`@libs`, `@utils`, `@middleware`, `@storage`); imports inside a layer stay relative
and extensionless. Neither form can be resolved by consumers, so the build rewrites
them to real relative `.js` paths:

- JavaScript: swc, via `paths` in `.swcrc`;
- declarations: `scripts/finalize-build.mjs`, which reads the aliases from `tsconfig.json`.

When adding an alias, update `tsconfig.json`, `.swcrc` and `vitest.config.ts`. `yarn e2e`
fails if an alias leaks into the published package.

## Local validation

```bash
yarn check                       # deps guard, format, lint, typecheck, tests + coverage, build
yarn check:deps                  # zero runtime dependencies, every peer optional
yarn e2e                         # the packed-tarball end-user suite (see e2e/README.md)
```

## Pull request checks

Every pull request (and every push to `main`) runs these workflows. Each job has a
short, stable name so it can be marked as a required check:

| Workflow (badge) | Check name  | Runs                                                                  | Required |
| ---------------- | ----------- | --------------------------------------------------------------------- | -------- |
| `ci.yml` (CI)    | `Lint`      | `yarn lint`                                                           | yes      |
| `ci.yml` (CI)    | `Typecheck` | `yarn typecheck`                                                      | yes      |
| `test.yml`       | `Test`      | `yarn test`                                                           | yes      |
| `e2e.yml`        | `E2E`       | `yarn e2e` on Node 18–26 + pnpm (summarizes the matrix jobs)          | yes      |
| `ci.yml` (CI)    | `Format`    | `yarn format:check`                                                   | optional |
| `build.yml`      | `Build`     | `yarn build`                                                          | optional |
| `build.yml`      | `Package`   | `yarn check:deps` (zero runtime dependencies guard)                   | yes      |
| `dependency-review.yml` | `Dependency review` | fails on new packages with moderate+ vulnerabilities | yes |
| `pr-title.yml`   | `PR title`  | Conventional Commits title (`feat:`, `fix(parser):`, …)              | optional |
| `codeql.yml`     | `Analyze (…)` | CodeQL security + code-quality queries (TypeScript and workflows)   | optional |

### Docs-only changes skip the code checks

`ci.yml`, `test.yml`, `build.yml` and `e2e.yml` start with a `Changes` job
(`.github/actions/changes`). When a pull request or push to `main` only touches
`*.md`, `*.yml` or `*.yaml` files, `Lint`, `Typecheck`, `Format`, `Test`, `Build`,
`Package` and the E2E matrix are skipped, and the `E2E` summary passes. Skipped jobs
count as passed for required checks, so docs-only PRs can still merge.

Exceptions that always run everything: `.yarnrc.yml` and `.github/actions/**`
(they change how dependencies install), tag pushes and `publish.yml` (a release is
always fully tested), manual runs and scheduled runs. CodeQL, dependency review,
PR title and the labeler are not affected.

The workflows use `paths-ignore` nowhere on purpose: a workflow that never starts
leaves its required checks "Pending" and blocks the merge.

### Repository automation

| Workflow / config            | What it does                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `dependabot.yml`             | Weekly npm + Actions updates, 5-day cooldown, majors in their own PR                 |
| `dependabot-auto-merge.yml`  | Auto-merges minor/patch devDependency and Actions PRs once required checks pass       |
| `pr-labeler.yml`             | Labels PRs by changed paths (`labeler.yml`)                                          |
| `release.yml`                | Groups generated release notes by those labels                                       |
| `pr-welcome.yml`             | Greets first-time contributors                                                       |
| `stale.yml`                  | Marks inactive issues/PRs stale after 60 days, closes after 14 more                  |
| `scorecard.yml`              | Weekly OpenSSF Scorecard; results in code scanning and the README badge              |
| `publish.yml`                | On a `v*` tag: `yarn check` + full e2e matrix, then publishes the tested tarball to npm (provenance) + GitHub Packages, creates the release |

One-time settings for the automation: **Settings → General → Allow auto-merge** (for
Dependabot auto-merge), and the dependency graph enabled (default on public repos)
for dependency review.

### Blocking merges until checks pass

Workflow files can't block a merge on their own. GitHub enforces it with a rule on
`main`, set once by a repository admin:

1. **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Name it `main`, set **Enforcement status** to **Active**, and under **Target
   branches** add **Include default branch**.
3. Enable **Require a pull request before merging**.
4. Enable **Require status checks to pass**, then **Add checks**: `Lint`, `Typecheck`,
   `Test`, `E2E`, `Package`, `Dependency review` (optionally `Format`, `Build` and
   `PR title`). Choose source **GitHub Actions**.
5. Optionally enable **Require branches to be up to date before merging**, so checks
   run against the latest `main`.
6. **Create**.

A check name can only be picked from the list once it has run at least once, so push
these workflows (or open a PR) before step 4.

