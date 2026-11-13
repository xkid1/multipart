# TypeScript Library Development Instructions

## Build & Validation Pipeline

### Pre-Commit Checklist

Before submitting any PR or push, run the full validation suite:

```bash
yarn check  # Runs: format check → lint → typecheck → coverage → build
```

This ensures all code passes **Prettier formatting**, **ESLint linting**, **TypeScript strict mode**, **Vitest coverage thresholds** (95% statements/functions/lines, 75% branches), and **full build**.

### Individual Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `yarn build`           | SWC compiles to `dist/`, tsc emits `.d.ts` |
| `yarn typecheck`       | tsc --noEmit (strict mode, no emit)        |
| `yarn lint`            | ESLint with security, import, TS rules     |
| `yarn lint:fix`        | Auto-fix ESLint violations                 |
| `yarn format`          | Prettier format in-place                   |
| `yarn format:check`    | Prettier dry-run (check only)              |
| `yarn test`            | Vitest run                                 |
| `yarn coverage`        | Vitest with coverage thresholds            |

## TypeScript & Code Style

### Imports & Module Syntax

- Use **ESM** imports/exports (`import`, `export`).
- Use **`import type`** for type-only imports (tree-shaking): `import type { FileData } from './types.js'`.
- Imports must use **`.js` extension** (NodeNext resolution): `import { parse } from './parse.js'` (not `'./parse'`).
- **Import ordering** (ESLint `import-x/order`):
  1. Built-in Node modules (`node:buffer`, `node:path`)
  2. External packages (rarely used; zero runtime deps preferred)
  3. Type imports (`import type`)
  4. Internal relative imports

### Type Safety

- **Strict mode enabled:** `"strict": true` in `tsconfig.json`.
- **No `any` types.** Use precise generic constraints:
  ```typescript
  // ✅ Good
  function parse<T extends Record<string, unknown>>(input: Buffer): T
  
  // ❌ Bad
  function parse(input: any): any
  ```
- **Explicit return types** on all exported functions.
- **Non-null assertions** (`!`) are forbidden; use type guards or optional chaining.
- **Array access safety:** Use `?? fallback` when accessing array indices:
  ```typescript
  const value = arr[index] ?? 0;  // ✅ Safe default
  ```

### Formatting & Style

- **Single quotes** for strings: `'hello'` not `"hello"`.
- **Trailing commas** in multiline structures (Prettier auto-applies).
- **Line length:** 100 columns max (Prettier enforces).
- **No commented-out code.** Delete or explain why it's needed.
- **JSDoc on all exported functions:**
  ```typescript
  /**
   * Parse multipart form-data from raw buffer.
   * @param body - The raw HTTP body as a Buffer.
   * @param boundary - The multipart boundary string.
   * @returns A Record of parsed fields and file metadata.
   * @throws TypeError if boundary is invalid.
   */
  export function parseFormData(body: Buffer, boundary: string): Record<string, FileData | string>
  ```

## Testing Requirements

### Coverage Thresholds

- **Statements:** 95%
- **Functions:** 95%
- **Lines:** 95%
- **Branches:** 75%

Run `yarn coverage` to verify thresholds before committing.

### Test Structure

- **Location:** Tests live in `src/**/*.test.ts`.
- **Framework:** Vitest (no external mocks; use pure TypeScript fixtures).
- **Determinism:** Never use `Math.random()`, time, or the network in tests. Use seeded RNGs if needed.

### Test Cases per Function

Every exported function must have:

1. **Happy path test:** Normal input → expected output.
2. **Boundary test:** Edge case inputs (empty buffer, max size, etc.).
3. **Invalid input test:** Malformed inputs → descriptive error.
4. **Over-capacity test:** Inputs that exceed limits → error or clamped behavior.

### Assertion Guidelines

- **Assert exact values:** Not just "throws an error" but "throws TypeError with message 'boundary too long'".
- **Never weaken assertions** to make a test pass. If a test catches a bug, report the failing input and fix the implementation.
- **Test error messages:** Ensure errors are descriptive and actionable.

## Buffer & Memory Safety

### Zero-Copy Operations

- Use **`Buffer.prototype.subarray`** for slicing (not `.slice`, which allocates new memory):
  ```typescript
  // ✅ Zero-copy slice
  const part = body.subarray(start, end);
  
  // ❌ Allocates new buffer (wasteful)
  const part = body.slice(start, end);
  ```

### Boundary Detection

- Use **`Buffer.prototype.indexOf`** for efficient byte searching:
  ```typescript
  const index = body.indexOf(boundaryBuffer);
  if (index === -1) { /* boundary not found */ }
  ```

### No Memory Leaks

- Do not hold references to large buffers in closures or caches without explicit cleanup.
- Return new `Buffer`s or `Uint8Array`s; never mutate input arguments.

## Encoding Detection

### BOM & Multi-Byte Detection

The encoding detector must correctly identify:

- **UTF-8:** EF BB BF (BOM) or valid multi-byte sequences.
- **UTF-16 BE:** FE FF (BOM).
- **UTF-16 LE:** FF FE (BOM).
- **UTF-32:** FE FF 00 00 (BE) or 00 00 FF FE (LE) (BOM).
- **ASCII/Latin-1:** Byte values 0x00–0x7F (ASCII) or 0x80–0xFF (Latin-1).
- **Binary:** Non-UTF-8 byte sequences without valid interpretation.

### Safety Rules

- **Test with binary files** (images, PDFs, archives) to ensure no false positives.
- **Never assume encoding** based on first byte alone; validate multi-byte sequences.
- **Default to UTF-8** with ASCII fallback for ambiguous cases.

## Error Handling

### Throw Conditions

- **`TypeError`** for invalid argument types or malformed headers.
- **`RangeError`** for boundary/field size violations.

### Error Messages

- **Descriptive and actionable:** `"boundary exceeds maximum length of 1024 bytes"` not `"boundary error"`.
- **Include context:** `"field 'username' contains invalid UTF-8 sequence at byte offset 42"`.

## Git & Commits

### Commit Message Format

Follow **Conventional Commits** (`conventional-changelog-angular` style):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`.

**Scopes:** `parser`, `encoding`, `headers`, `bounds`, etc.

**Examples:**
```
fix(parser): handle boundary detection on partial reads

refactor(encoding): split encoding detection into separate utility

test(headers): add edge cases for filename extraction

feat(parser): add support for RFC 2388 compliance
```

### GPG Signing

- **Always sign commits** with GPG key `C8F0BFFD1938A1D8`.
- Configure Git: `git config user.signingkey C8F0BFFD1938A1D8`.
- Sign on commit: `git commit -S -m "message"`.
- Verify signature: `git log --show-signature`.

## Zero External Dependencies

### Policy

- **Runtime dependencies:** Strictly zero. All parsing uses only Node.js built-in APIs.
- **Dev dependencies:** Only build tools (SWC, TypeScript, ESLint, Vitest, Prettier). No test mocks or utilities beyond Vitest.
- **Rationale:** Maximum security, minimal bundle size, zero supply-chain risk.

### Before Adding a Package

1. Propose the package in an issue with **justification** (why it cannot be done with native APIs).
2. Await explicit approval from maintainers.
3. Document the decision in `CHANGELOG.md` and `AGENTS.md`.

## Architectural Constraints

### Boundary Handling

- **Format:** `\r\n--<boundary>` (CRLF + dashes + boundary string).
- **Terminator:** `\r\n--<boundary>--\r\n` (final boundary with `--` suffix).
- **Max length:** 1024 bytes (including CRLF and dashes).

### Header Parsing

- Parse `Content-Disposition` and `Content-Type` headers.
- Extract: field `name`, uploaded `filename`, MIME `type`, file `extension`.
- Handle edge cases: missing extension, non-ASCII filenames (RFC 2047), quoted strings.

### Encoding Detection

- Inspect Byte Order Marks (BOM).
- Validate UTF-8, UTF-16, UTF-32 multi-byte sequences.
- Fall back to ASCII or Latin-1 for non-UTF content.
- Reject or flag binary data without clear encoding.

## Public API Checklist

When adding or modifying a public API:

- [ ] Write tests (happy path, boundary, invalid input, over-capacity).
- [ ] Implement in `src/libs/multipart/` or `src/utils/multipart/`.
- [ ] Add JSDoc with `@param`, `@returns`, `@throws`.
- [ ] Export from `src/index.ts`.
- [ ] Update `README.md` API tables.
- [ ] Update `CHANGELOG.md` with new version entry.
- [ ] Run `yarn check` (all checks pass).
- [ ] Sign commit with GPG key.

## Common Pitfalls

| Pitfall                                | Fix                                                 |
| -------------------------------------- | --------------------------------------------------- |
| Using `.slice()` instead of `.subarray()` | Switch to zero-copy `subarray()` for large buffers |
| No JSDoc on exported functions         | Add JSDoc with `@param`, `@returns`, `@throws`    |
| Test coverage below 95%                | Add missing edge case tests                         |
| Ignoring ESLint warnings               | Run `yarn lint:fix` and fix remaining manually     |
| Non-GPG-signed commits                 | Use `git commit -S` or configure auto-signing      |
| Introducing external dependencies      | Propose in issue and await approval first          |
| Using `any` types                      | Replace with precise generic constraints            |
| Mutating function arguments            | Create new Buffer/Uint8Array and return it         |
