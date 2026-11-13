# Prompts: Multipart Parser Development & Maintenance

This file contains standard prompt templates for instructing AI agents to work on the `@xkid1/multipart` library.

## Prompt: Feature Addition or Optimization

Use this structure when requesting a new feature or performance improvement:

> "You are an expert systems engineer working on `@xkid1/multipart`, a zero-dependency multipart form-data parser for Node.js. Your task is to **[describe feature, e.g., 'add stream chunking support to parseFormData' or 'optimize boundary detection for large payloads']**.
>
> **Constraints:**
> - Maintain zero runtime dependencies; only use Node.js built-in APIs (`node:buffer`, `node:path`, etc.).
> - Write comprehensive unit tests (happy path, boundary, invalid input, over-capacity) with Vitest; aim for 95%+ coverage.
> - Execute `yarn check` to verify types (strict mode), linting (ESLint), and tests all pass.
> - Preserve all existing JSDoc definitions and add JSDoc for new functions (`@param`, `@returns`, `@throws`).
> - Use ESM syntax (`import`, `export`), `.js` extensions on relative imports, and `import type` for type-only imports.
> - Sign all commits with GPG key `C8F0BFFD1938A1D8` using conventional commit messages (`feat:`, `fix:`, `refactor:`, `test:`).
> - Update `README.md` API tables and `CHANGELOG.md` if behavior or the API changes.
>
> **Definition of Done:**
> - `yarn check` passes (format, lint, typecheck, coverage, build).
> - All tests passing; coverage thresholds met (95%/95%/95% statements/functions/lines, 75% branches).
> - New/changed behavior documented in `README.md` and `CHANGELOG.md`.
> - GPG-signed commit(s) with descriptive message(s).

## Prompt: Bug Fix or Debugging

Use this when reporting a bug or requesting debugging:

> "I've found a bug in `@xkid1/multipart`: **[describe issue, e.g., 'parseFormData throws on boundaries with leading whitespace' or 'filename extraction fails for RFC 2047 encoded names']**.
>
> **Repro steps:**
> [Provide minimal code to reproduce]
>
> **Expected behavior:**
> [Describe what should happen]
>
> **Actual behavior:**
> [Describe what actually happens]
>
> **Your task:**
> 1. Verify the bug by writing a failing test case.
> 2. Fix the root cause in `src/libs/multipart/` or `src/utils/multipart/`.
> 3. Ensure the fix passes `yarn check` and all existing tests still pass.
> 4. Document the fix in `CHANGELOG.md` with a reference to this issue.
> 5. Sign the commit(s) with GPG key `C8F0BFFD1938A1D8`.

## Prompt: Code Review & Testing

Use this when reviewing changes or adding tests:

> "Please review the changes in [branch/PR] against these criteria:
>
> **Code Quality:**
> - [ ] No external dependencies introduced (zero-dependency policy).
> - [ ] All functions have JSDoc with `@param`, `@returns`, `@throws`.
> - [ ] TypeScript strict mode passes (`yarn typecheck`).
> - [ ] ESLint passes (`yarn lint`); import ordering is correct.
> - [ ] Prettier formatting applied (`yarn format`).
>
> **Testing:**
> - [ ] New/changed behavior has tests (happy path, boundary, invalid input, over-capacity).
> - [ ] Coverage thresholds met: 95%/95%/95% statements/functions/lines, 75% branches.
> - [ ] Tests are deterministic (no `Math.random()`, time, or network).
> - [ ] Error messages are descriptive and actionable.
>
> **Documentation:**
> - [ ] `README.md` API tables updated if API changed.
> - [ ] `CHANGELOG.md` entry added for new version.
> - [ ] Commit message follows conventional commit format.
> - [ ] Commits are GPG-signed (key `C8F0BFFD1938A1D8`).
>
> **Definition of Done:**
> - `yarn check` passes (all checks green).
> - All existing tests still pass (no regressions).

## Prompt: Refactoring & Splitting Utilities

Use this when reorganizing code into utility modules:

> "I need to refactor and split `@xkid1/multipart` to improve maintainability. Your task:
>
> 1. **Analyze** the current `src/libs/multipart/multipart.ts` for opportunities to extract focused utility functions.
> 2. **Create** new utility modules in `src/utils/multipart/` with single responsibilities:
>    - Header parsing utilities (`parse-headers/`)
>    - Boundary and part extraction utilities (`parse-parts/`)
>    - Each utility should be 8–30 lines of focused code.
> 3. **Update** `src/libs/multipart/multipart.ts` to use the new utilities; reduce to core parsing logic.
> 4. **Fix** any ESLint violations (import ordering, unused variables, etc.) with `yarn lint:fix`.
> 5. **Test** that all existing tests still pass; coverage remains >= 95%.
> 6. **Ensure** `yarn check` passes (all validations green).
> 7. **Document** changes in `CHANGELOG.md` and `AGENTS.md`.
> 8. **Sign** commit(s) with GPG key.
>
> **Outcome:** Well-organized utility modules, improved code reusability, 100% test coverage maintained.

## Prompt: Performance & Optimization

Use this when focusing on performance:

> "You are optimizing `@xkid1/multipart` for performance on large multipart payloads. Your task:
>
> 1. **Profile** the current implementation (identify hot paths).
> 2. **Optimize** using:
>    - Zero-copy buffer slicing (`Buffer.prototype.subarray` instead of `.slice()`).
>    - Efficient byte searching (`Buffer.prototype.indexOf`).
>    - Reduced allocations in loops.
> 3. **Benchmark** before/after (e.g., parse 10MB multipart payload).
> 4. **Test** that behavior is unchanged (all tests pass).
> 5. **Document** the optimization in a new section of `README.md` (\"Performance\").
> 6. **Commit** with message `perf: optimize boundary detection for large payloads`.

## Prompt: Encoding Detection Enhancement

Use this when improving character encoding support:

> "I need to enhance encoding detection in `@xkid1/multipart`. Your task:
>
> 1. **Review** the current `encoding()` function for gaps in UTF-8/16/32, ASCII, Latin-1, and binary detection.
> 2. **Add support** for:
>    - Byte Order Mark (BOM) detection: UTF-8, UTF-16 BE/LE, UTF-32 BE/LE.
>    - Multi-byte sequence validation for UTF-8, UTF-16, UTF-32.
>    - ASCII (0x00–0x7F) and Latin-1 (0x80–0xFF) detection.
>    - Binary fallback for non-text content.
> 3. **Write tests** for each encoding with valid and invalid sequences.
> 4. **Test with real files** (PDFs, images, archives) to prevent false positives.
> 5. **Ensure** `yarn check` passes.
> 6. **Update** `CHANGELOG.md` with encoding improvements.

## Prompt: Publishing & Release

Use this when preparing a release:

> "I need to release a new version of `@xkid1/multipart` to npm. Your task:
>
> 1. **Verify:** `yarn check` passes (format, lint, typecheck, coverage, build).
> 2. **Update:**
>    - Bump `package.json` version (major.minor.patch following semver).
>    - Add `## [x.y.z]` section to `CHANGELOG.md` with changes.
>    - Tag: `git tag vx.y.z`.
> 3. **Push:** `git push --follow-tags`.
> 4. **Await:** GitHub Actions runs `publish.yml` workflow.
> 5. **Verify:** npm package is published to GitHub Packages (`npm.pkg.github.com`).
> 6. **Announce:** Summarize changes in release notes.

## Prompt: Documentation & Guidelines

Use this when updating documentation:

> "Update the developer documentation for `@xkid1/multipart`. Your task:
>
> 1. **Review:**
>    - `AGENTS.md` — agent directives, conventions, limitations.
>    - `.github/instructions/coding-standards.instructions.md` — code style, testing, git.
>    - `.github/skills/multipart-parsing/SKILL.md` — parser logic, edge cases, testing patterns.
>    - `.github/skills/ts-library-tooling/SKILL.md` — toolchain, commands, troubleshooting.
>    - `.github/skills/vitest-testing/SKILL.md` — test structure, patterns, coverage.
>
> 2. **Update:** [specific section, e.g., 'Add a section on streaming multipart parsing (future work)']
> 3. **Verify:** Documentation is accurate, examples work, links are valid.
> 4. **Commit:** `docs: [description]`.

---

## Quick Reference: Common Scenarios

| Scenario                                | Use Prompt                            | Command                      |
| --------------------------------------- | ------------------------------------- | ---------------------------- |
| Add a new feature (e.g., stream support) | Feature Addition or Optimization      | `yarn check`                 |
| Fix a bug (e.g., encoding issue)        | Bug Fix or Debugging                  | `yarn test`, `yarn check`    |
| Review a PR                             | Code Review & Testing                 | `yarn check`                 |
| Refactor utilities                      | Refactoring & Splitting Utilities    | `yarn check`, `yarn lint:fix` |
| Speed up parsing                        | Performance & Optimization            | `yarn coverage`, `yarn check` |
| Improve encoding detection              | Encoding Detection Enhancement       | `yarn test`, `yarn check`    |
| Release to npm                          | Publishing & Release                  | `git push --follow-tags`     |
| Update docs                             | Documentation & Guidelines            | Spell-check, link validation |
