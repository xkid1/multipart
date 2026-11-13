---
name: ts-library-tooling
description: Build, lint, type-check, and package this TypeScript library with Node 26.13.0, Yarn 4.18.0, SWC, ESLint with jiti, Vitest, and Prettier. Covers commands, toolchain constraints, and fixes for common setup and build errors. Use when running checks, changing configs, or debugging CI.
---

# TypeScript Library Toolchain

## Overview

This skill covers end-to-end build, validation, and packaging for `@xkid1/multipart`, a pure TypeScript, zero-dependency Node.js library.

| Tool                   | Role                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| Node `>=26.13.0`       | Runtime (`.nvmrc` = 26.13.0)                                          |
| Yarn `4.18.0`          | Package manager via `packageManager`; `nodeLinker: node-modules`      |
| SWC (`@swc/cli`)       | Compiles TypeScript `src/` to JavaScript `dist/`                      |
| `tsc` (TypeScript 6.0) | Type-checks and emits `.d.ts` declarations only (no JS emission)      |
| ESLint 10 + jiti       | `strictTypeChecked` linting; jiti loads `eslint.config.ts`            |
| Vitest 5 + vite        | Unit tests, v8 coverage (thresholds 95%/95%/95%, branches 75%)        |
| Prettier               | Single quotes, trailing commas, 100-column line length               |

## Command Reference

### Comprehensive Checks

```bash
yarn check              # Full validation pipeline (RECOMMENDED before commit)
                        # Runs: format:check → lint → typecheck → coverage → build
                        # Fails on first error
```

### Individual Commands

| Command                  | Purpose                                                    | Exit Code |
| ------------------------ | ---------------------------------------------------------- | --------- |
| `yarn install --immutable` | Install exact versions from `yarn.lock` (CI-safe)        | 0 / 1     |
| `yarn build`             | SWC: `src/` → `dist/`, tsc: emit `.d.ts` only            | 0 / 1     |
| `yarn typecheck`         | tsc --noEmit (dry-run, no file emission)                 | 0 / 1     |
| `yarn lint`              | ESLint scan (no auto-fix)                                 | 0 / 1     |
| `yarn lint:fix`          | ESLint with auto-fix (modifies files)                    | 0 / 1     |
| `yarn format`            | Prettier in-place (modifies files)                        | 0 / 1     |
| `yarn format:check`      | Prettier dry-run (no modifications)                      | 0 / 1     |
| `yarn test`              | Vitest run (single pass)                                 | 0 / 1     |
| `yarn test:watch`        | Vitest watch mode (interactive)                          | 0 / n/a   |
| `yarn coverage`          | Vitest with coverage thresholds (enforced)              | 0 / 1     |

### Pre-Commit Workflow

```bash
# 1. Format code
yarn format

# 2. Fix lint issues automatically where possible
yarn lint:fix

# 3. Run full validation
yarn check

# 4. Commit with GPG signature
git commit -S -m "feat(parser): add streaming support"
```

## Toolchain Constraints & Configuration

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",                    // Modern Node 26
    "module": "ES2020",                    // ESM output
    "moduleResolution": "NodeNext",        // Node resolution with .js extensions
    "verbatimModuleSyntax": true,          // Emit import/export as-is
    "strict": true,                        // All strict checks on
    "noUncheckedIndexedAccess": true,      // Require ?? on array reads
    "declaration": true,                   // Emit .d.ts
    "declarationMap": true,                // Emit .d.ts.map
    "sourceMap": true,                     // Emit .js.map
    "outDir": "./dist"                     // Output directory
  }
}
```

**Key flags:**
- `noUncheckedIndexedAccess: true` requires `arr[i] ?? fallback` for all array accesses.
- `verbatimModuleSyntax: true` preserves `import type` vs `import` and rejects namespace re-exports.
- `moduleResolution: NodeNext` requires `.js` extensions on relative imports (even in `.ts` files).

### SWC Configuration (`.swcrc`)

- Emits ES2020 JavaScript with source maps.
- Stripping decorators (if used) and preserving JSDoc.
- No down-level async/await transformation (Node 26 supports natively).

### ESLint Configuration (`eslint.config.ts`)

- `strictTypeChecked`: Enables strict TypeScript linting rules.
- `security`: Scans for security antipatterns.
- `import-x/order`: Enforces import grouping (builtins → externals → types → internals).
- `jiti`: Dynamic loader for `eslint.config.ts` (allows ESM syntax in config).

### Vitest Configuration (`vitest.config.ts`)

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  lines: 95,
  functions: 95,
  statements: 95,
  branches: 75
}
```

Coverage thresholds are **enforced** on `yarn coverage`.

### Prettier Configuration (`.prettierrc.ts`)

```typescript
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  useTabs: false,
  tabWidth: 2,
  arrowParens: 'always'
};
```

## Common Tasks

### Running a Subset of Tests

```bash
yarn test --run -t "boundary detection"     # Filter by name
yarn test --run src/libs/multipart/multipart.test.ts  # Single file
yarn test --run --reporter=verbose          # Verbose output
```

### Checking Code Coverage by Module

```bash
yarn coverage --reporter=html                # Generates HTML report
open coverage/index.html                     # View in browser
```

### Auto-Fixing Lint & Format Issues

```bash
yarn lint:fix      # Auto-fix ESLint violations
yarn format        # Auto-format with Prettier
yarn check         # Verify all fixes worked
```

### Debugging Type Errors

```bash
yarn typecheck                               # Show all type errors
yarn typecheck --pretty false                # Concise output for CI
```

## Troubleshooting

### Node/Yarn Issues

| Symptom                                  | Cause & Fix                                                           |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `yarn: command not found`                | Node 25+ removed Corepack. Install: `npm install -g corepack && corepack enable` |
| `YN0028 lockfile would have been modified` | Run `yarn install` locally, commit `yarn.lock`; never use npm       |
| `error Command "yarn" not found in PATH` | Ensure Corepack is enabled: `corepack enable`                        |

### Build & Compilation

| Symptom                                | Cause & Fix                                                       |
| -------------------------------------- | ----------------------------------------------------------------- |
| `dist/` is missing or empty            | Run `yarn build`. Check `.swcrc` and `tsconfig.json` paths.       |
| `Cannot find module './x.js'`          | Import paths need `.js` extension (NodeNext). Change to `'./x.js'` |
| `.d.ts` files not generated            | SWC doesn't emit types. Run `tsc` after SWC. `yarn build` does this. |
| Type checking fails in `dist/`         | `dist/` contains compiled JS, not source. Check `src/` instead.   |
| `Cannot find module '@utils'`          | Path alias not resolved. Check `tsconfig.json` has `"@utils": ["./src/utils"]` |

### Linting & Formatting

| Symptom                              | Cause & Fix                                                        |
| ------------------------------------ | ------------------------------------------------------------------ |
| ESLint: `unnecessary ?? condition`   | Array access without `??`. Change `arr[i]` to `arr[i] ?? 0`       |
| ESLint: `restrict-template-expressions` | Use `${String(n)}` for numbers. Change `${n}` to `${String(n)}`   |
| ESLint: `no-unused-vars`             | Remove unused variable or prefix with `_` for intentional omission |
| ESLint: cannot load config           | jiti not installed. Run `yarn install --immutable`                |
| Prettier: unexpected formatting      | Run `yarn format` to auto-fix; some rules override ESLint         |

### Testing & Coverage

| Symptom                                | Cause & Fix                                             |
| -------------------------------------- | ------------------------------------------------------- |
| Coverage threshold not met             | Add missing tests. Do not lower thresholds without reason. |
| `ENOENT: no such file or directory`    | Test file path wrong. Check `src/` structure.          |
| Test timeout                           | Long-running test or infinite loop. Add `timeout: 10000` to test. |
| Coverage report missing                | Run `yarn coverage --reporter=html`; open `coverage/index.html` |

## Git Workflow

### Before Committing

```bash
# 1. Ensure dependencies are installed
yarn install --immutable

# 2. Format and lint
yarn format
yarn lint:fix

# 3. Run full checks
yarn check

# 4. Create commit with GPG signature
git add .
git commit -S -m "feat(parser): descriptive message"

# 5. Verify signature
git log --show-signature -1
```

### Handling Merge Conflicts

```bash
# After resolving conflicts in `yarn.lock`:
yarn install --immutable

# Re-run checks to ensure consistency
yarn check

git add yarn.lock
git commit -S -m "chore: resolve merge conflict in yarn.lock"
```

## Performance Optimization

### Build Time

- **SWC is fast**: Typically < 1s for full build.
- **tsc type-check**: 2–5s (parallelizable if needed, but usually acceptable).
- **Combined `yarn build`**: < 10s on modern hardware.

### Test Execution

- **Vitest with v8 coverage**: 5–15s depending on test suite size.
- Watch mode: Incremental re-runs (typically 1–2s per change).

### Lint Time

- **ESLint on 20+ files**: 3–5s.
- Incremental linting (via IDE or pre-commit hook): < 1s per file.

## Integration with CI/CD

### GitHub Actions

- Workflow file: `.github/workflows/ci.yml`.
- Runs on every push and PR.
- Required checks:
  - `yarn check` (format, lint, type, coverage, build)
  - `yarn test` (unit tests)
  - Optional: `bash scripts/smoke-consumer.sh` (consumer packing test)

### Local Pre-Commit Hook

```bash
#!/bin/sh
yarn format:check && yarn lint && yarn typecheck && yarn test --run
```

Save to `.git/hooks/pre-commit` and `chmod +x` to enforce checks before committing.

## Dependency Management

### Adding a Dependency

**Rationale:** This is a **zero-runtime-dependency** library. Dev dependencies only for tooling.

```bash
# Adding to devDependencies (tooling only)
yarn add --dev some-tool

# ❌ Never add to dependencies
# yarn add some-package  # FORBIDDEN
```

### Updating Dependencies

```bash
# Check outdated packages
yarn upgrade-interactive

# Update lockfile
yarn install --immutable

# Run checks
yarn check
```

### Upgrading TypeScript

Keep `typescript` on `~6.0.x` (peer dependency of `typescript-eslint <6.1.0`).

```bash
yarn up typescript@~6.0
yarn check
```

Upgrading to TypeScript 7+ will break linting; coordinate with team before attempting.

## Known Limitations

- **NodeNext requires `.js` extensions:** Relative imports in `.ts` files must end with `.js`.
- **No CommonJS distribution:** Package is ESM-only. Consumers can use `require()` on Node 16+, but ESM is preferred.
- **Corepack required:** Node 25+ does not bundle Corepack; users must install it manually.
- **Branch coverage 75% (not 95%):** `noUncheckedIndexedAccess` makes some branches unreachable; threshold is pragmatic.
- **No streaming support:** Entire payload must be buffered in memory (architectural constraint).
