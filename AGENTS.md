# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

`@xkid1/multipart` is a **zero-runtime-dependency**, lightweight multipart form-data parser middleware for Node.js in pure TypeScript. The parser handles RFC-compliant boundary detection, header parsing (name, filename, MIME type), file extension extraction, and encoding detection. Cross-protocol consistency with the C, Rust, and hardware implementations is maintained through exhaustive test suites and golden vectors.

**Toolchain:** Node `>=26.13.0`, Yarn `4.18.0`, TypeScript `~6.0.x`, SWC, ESLint 10 with jiti, Vitest 5, Prettier, Git (`C8F0BFFD1938A1D8` GPG key).

## Repository Layout

| Path                                           | Purpose                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `src/libs/multipart/multipart.ts`              | Main parser: RFC boundary detection, header parsing, file metadata      |
| `src/utils/multipart/parse-headers/`           | Header extraction: name, filename, MIME type, file extension            |
| `src/utils/multipart/parse-parts/`             | Part extraction: boundary location, section splitting, part validation  |
| `src/index.ts`                                 | TypeScript public exports                                               |
| `.github/agents/`                              | Repository-specific agent directives                                    |
| `.github/instructions/`                        | Language-specific and tooling guidance                                  |
| `.github/prompts/`                             | Prompt templates for feature extensions and optimizations               |
| `.github/skills/`                              | Repository-specific skill documentation                                 |
| `.github/workflows/`                           | CI/CD pipelines, publishing, and validation                             |

## Language-Specific Instructions and Commands

Use the language-specific guidance for edits and validation:

| Language/Toolchain | Instructions                            | Primary Checks                                   |
| ------------------ | ---------------------------------------- | ------------------------------------------------ |
| TypeScript / Node  | `.github/instructions/coding-standards` | `yarn check`, `bash scripts/smoke-consumer.sh`  |

TypeScript/Node conventions apply to `src/` and `scripts/`. Maintain strict typing, zero external dependencies, and high test coverage for all modifications.

## Shared Commands

```bash
yarn install --immutable
yarn check                       # prettier, eslint, tsc, vitest coverage, build
yarn test                        # vitest run
yarn coverage                    # with thresholds
yarn lint | yarn lint:fix
yarn format | yarn format:check
yarn typecheck
yarn build                       # SWC to dist/, tsc emits .d.ts
```

Node 25+ does not bundle Corepack. If `yarn` is missing: `npm install -g corepack && corepack enable`.

## Conventions

- Strict TypeScript with `noUncheckedIndexedAccess`: use `?? 0` on array reads. No `any`, no non-null assertions.
- Relative imports use the `.js` extension (NodeNext). Use `type` imports and exports (`verbatimModuleSyntax`).
- In template strings write `${String(n)}` for numbers.
- Throw only `TypeError` or `RangeError` with descriptive messages.
- Never mutate arguments; return new `Uint8Array`s or `Buffer`s.
- **Zero runtime dependencies.** Never introduce external npm packages without explicit approval.
- Buffer operations use `Buffer.prototype.subarray` for zero-copy slicing and `Buffer.prototype.indexOf` for efficient scanning.
- Encoding detection: inspect Byte Order Marks (BOM), UTF-8/16/32 multi-byte validity, ASCII/Latin-1 character ranges, and binary signatures.
- RFC-compliant boundary detection: boundaries are `\r\n--<boundary>` (with leading CRLF) and terminated with `\r\n--<boundary>--\r\n`.
- Prettier: single quotes, trailing commas, 100 columns.

## Testing

- Tests live in `src/*.test.ts`. Use only deterministic logic; never `Math.random()`, time, or the network.
- Every public routine needs a happy path, a boundary case, and an invalid-input case.
- Assert exact values and precise error messages. Do not weaken assertions to make tests pass.
- Test coverage thresholds: statements, functions, lines 95%; branches 75%.
- No external mock libraries; use pure TypeScript fixtures and helpers.

## Adding or Changing a Public API

1. Write tests first (following the Testing section).
2. Implement in `src/libs/multipart/` or `src/utils/multipart/`, add JSDoc, export from `src/index.ts`.
3. Update `README.md` API tables and `CHANGELOG.md`.
4. Run `yarn check` to validate all checks.

## Releasing

- Keep `package.json` `version`, a `## [x.y.z]` heading in `CHANGELOG.md`, and the release tag `vx.y.z` in sync.
- The scope must equal the repository owner (`@xkid1`), with `publishConfig.registry` set to `https://npm.pkg.github.com`.
- Push a tag matching `v` + `package.json` version. `publish.yml` runs checks and stages the package on npm using the `NPM_TOKEN` Actions secret.
- After npm's automated review completes, approve the stage with `npm stage approve <stage-id>` and npm account authentication.
- After npm reports the version is published, manually run `publish.yml` from the default branch with that release tag as `release_tag`. It verifies the public npm version, publishes to GitHub Packages with `GITHUB_TOKEN`, then creates the GitHub Release.
- Do not configure npm OIDC trusted publishing for this workflow; npm uses the stage-only granular token. Never request, print, or store a token; if one is exposed, tell the user to revoke it.
- Agents cannot authenticate. Never request, print, or store a token; if one is exposed, tell the user to revoke it.
- Published versions are permanent. Fix problems with a new patch version.
- GitHub Packages requires a `read:packages` token to install, even for public packages.

## Specialized Guidance

Use the matching custom agent, skill, or prompt instead of improvising:

- **Implementing multipart parsing features:** Agent `multipart-parser`; skills `multipart-parsing`, `ts-library-tooling`; prompts `refactor`.
- **Reviewing changes:** Agent `code-review`.
- **Writing or fixing tests:** Agent `vitest-testing`; skill `vitest-testing`.
- **Releasing packages:** Skill `github-packages-publish`.

**Agent Directives:** See `.github/agents/parser.agent.md` for the `multipart-parser` agent directive.

**Skill Definitions:** See `.github/skills/` for multipart parsing, TypeScript library tooling, Vitest testing, and GitHub Packages publishing.

**Prompts:** See `.github/prompts/refactor.prompt.md` for feature extension and optimization prompts.

## Definition of Done

- `yarn check` passes (format, lint, types, coverage, build).
- New or changed behavior has tests that follow the Testing section.
- `README.md` and `CHANGELOG.md` are updated when behavior or the API changes.
- Commit messages follow conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`).
- Commits are signed with GPG key `C8F0BFFD1938A1D8`.

## Known Limitations

- Multipart boundaries are limited to 1024 bytes.
- Field values and filenames are parsed as UTF-8 with ASCII fallback; other encodings may not be recognized.
- Stream-based parsing is not supported; the entire payload must be buffered.
- No streaming file uploads or backpressure handling.
- This parser does not handle nested multipart bodies or multipart/alternative content types.
