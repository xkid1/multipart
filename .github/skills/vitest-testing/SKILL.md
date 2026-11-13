---
name: vitest-testing
description: Write deterministic, high-signal Vitest tests for the multipart parser, including boundary detection, header extraction, encoding validation, and integration tests. Use when adding, reviewing, or debugging tests in this repo.
---

# Testing: Multipart Parser Unit & Integration Tests

## Overview

This skill covers writing, reviewing, and debugging TypeScript/Vitest tests for `@xkid1/multipart`. The multipart parser is a pure function with no I/O dependencies, making tests deterministic and fast.

## Coverage Requirements

| Area                                    | Cases & Assertions                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| **Boundary Detection**                  | Valid format, missing final boundary, oversized, empty, nested (invalid)       |
| **Header Parsing (Content-Disposition)** | Valid `name`, valid `filename`, quoted strings, RFC 2047, missing fields     |
| **Header Parsing (Content-Type)**       | Valid MIME type, charset, malformed                                           |
| **File Extension Extraction**           | `.png`, `.tar.gz`, no extension (handle safely), special chars, uppercase     |
| **Encoding Detection**                  | UTF-8 (BOM & no BOM), UTF-16 (BE/LE), ASCII, Latin-1, binary, partial UTF-8 |
| **Part Extraction**                     | Valid parts, missing header/body separator, corrupted CRLF, oversized fields  |
| **Field Name Extraction**               | Valid, duplicates (use first), empty, special chars, quoted                   |
| **Filename Extraction**                 | Valid, quoted, RFC 2047 encoded, non-ASCII, missing, special chars           |
| **MIME Type Extraction**                | Valid, with charset, malformed, missing                                       |
| **Integration**                         | Multi-field forms, mixed text/binary, large files, edge cases                 |
| **Overhang/EOF Handling**               | Missing epilogue, partial final boundary, truncated payload                   |

## Test Structure

### Single-Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { parseFormData } from '../src/libs/multipart/multipart.js';

describe('parseFormData', () => {
  it('parses valid single-field form', () => {
    // Arrange
    const boundary = 'boundary123';
    const body = Buffer.from(
      `--boundary123\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n--boundary123--\r\n`
    );

    // Act
    const result = parseFormData(body, boundary);

    // Assert
    expect(result).toEqual({ username: 'alice' });
  });

  it('throws TypeError if boundary is invalid', () => {
    // Arrange
    const boundary = '';
    const body = Buffer.from('some data');

    // Act & Assert
    expect(() => parseFormData(body, boundary)).toThrow(TypeError);
  });
});
```

**Pattern breakdown:**
1. **Arrange:** Set up test data (buffers, boundaries, expected values).
2. **Act:** Call the function under test.
3. **Assert:** Verify exact output or expected error.

### Happy Path Test

- Valid input → expected output.
- Assert **exact** field values and types.
- Example: Single-field form → parsed object with correct field name and value.

### Boundary Test

- Edge cases: empty buffer, single-byte parts, final boundary missing.
- Assert: error handling or partial success (documented behavior).

### Invalid Input Test

- Malformed headers, missing CRLF, corrupted boundaries.
- Assert: **descriptive** error with `TypeError` or `RangeError`.
- Message should indicate: what was invalid and where (byte offset if possible).

### Over-Capacity Test

- Boundary > 1024 bytes, field value > memory limit.
- Assert: error thrown with clear message (not silent truncation).

## Example Tests

### Boundary Detection

```typescript
it('detects valid boundary in multipart body', () => {
  const boundary = 'boundary123';
  const body = Buffer.from(
    `--boundary123\r\nContent-Disposition: form-data; name="field"\r\n\r\nvalue\r\n--boundary123--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  expect(result).toHaveProperty('field', 'value');
});

it('throws if boundary is missing', () => {
  const boundary = 'boundary123';
  const body = Buffer.from('not a multipart body');
  
  expect(() => parseFormData(body, boundary)).toThrow(TypeError);
});

it('throws if boundary exceeds 1024 bytes', () => {
  const boundary = 'x'.repeat(1025);
  const body = Buffer.from('data');
  
  expect(() => parseFormData(body, boundary)).toThrow(RangeError);
});
```

### Header Extraction

```typescript
it('extracts field name from Content-Disposition', () => {
  const boundary = 'b';
  const body = Buffer.from(
    `--b\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n--b--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  expect(result).toHaveProperty('username');
  expect(result.username).toBe('alice');
});

it('extracts filename from Content-Disposition', () => {
  const boundary = 'b';
  const body = Buffer.from(
    `--b\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\nPNG_DATA\r\n--b--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  const fileData = result.file;
  expect(fileData).toHaveProperty('filename', 'avatar.png');
  expect(fileData).toHaveProperty('extension', '.png');
  expect(fileData).toHaveProperty('mimeType', 'image/png');
});

it('handles filename without extension safely', () => {
  const boundary = 'b';
  const body = Buffer.from(
    `--b\r\nContent-Disposition: form-data; name="file"; filename="README"\r\n\r\nDATA\r\n--b--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  const fileData = result.file;
  expect(fileData).toHaveProperty('filename', 'README');
  expect(fileData).toHaveProperty('extension', ''); // Not 'README'!
});
```

### Encoding Detection

```typescript
it('detects UTF-8 with BOM', () => {
  const boundary = 'b';
  const utf8Bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const body = Buffer.concat([
    Buffer.from(`--b\r\nContent-Disposition: form-data; name="text"\r\n\r\n`),
    utf8Bom,
    Buffer.from('hello\r\n--b--\r\n')
  ]);
  
  const result = parseFormData(body, boundary);
  expect(result.text).toContain('hello');
});

it('detects ASCII correctly', () => {
  const boundary = 'b';
  const body = Buffer.from(
    `--b\r\nContent-Disposition: form-data; name="ascii"\r\n\r\nHello World!\r\n--b--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  expect(result.ascii).toBe('Hello World!');
});

it('rejects non-UTF-8 binary data', () => {
  const boundary = 'b';
  const binaryData = Buffer.from([0x80, 0x81, 0x82]); // Invalid UTF-8
  const body = Buffer.concat([
    Buffer.from(`--b\r\nContent-Disposition: form-data; name="bin"\r\n\r\n`),
    binaryData,
    Buffer.from('\r\n--b--\r\n')
  ]);
  
  expect(() => parseFormData(body, boundary)).toThrow();
});
```

### Integration Tests

```typescript
it('parses multi-field form with mixed text and files', () => {
  const boundary = 'myboundary';
  const body = Buffer.from(
    `--myboundary\r\n` +
    `Content-Disposition: form-data; name="username"\r\n\r\n` +
    `alice\r\n` +
    `--myboundary\r\n` +
    `Content-Disposition: form-data; name="avatar"; filename="pic.jpg"\r\n` +
    `Content-Type: image/jpeg\r\n\r\n` +
    `JPEG_BINARY_DATA\r\n` +
    `--myboundary\r\n` +
    `Content-Disposition: form-data; name="bio"\r\n\r\n` +
    `Software engineer\r\n` +
    `--myboundary--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  expect(result).toHaveProperty('username', 'alice');
  expect(result).toHaveProperty('bio', 'Software engineer');
  expect(result.avatar).toHaveProperty('filename', 'pic.jpg');
  expect(result.avatar).toHaveProperty('mimeType', 'image/jpeg');
});

it('ignores preamble before first boundary', () => {
  const boundary = 'b';
  const body = Buffer.from(
    `This is preamble text\r\n` +
    `--b\r\nContent-Disposition: form-data; name="field"\r\n\r\nvalue\r\n` +
    `--b--\r\n`
  );
  
  const result = parseFormData(body, boundary);
  expect(result).toEqual({ field: 'value' });
});

it('ignores epilogue after final boundary', () => {
  const boundary = 'b';
  const body = Buffer.from(
    `--b\r\nContent-Disposition: form-data; name="field"\r\n\r\nvalue\r\n` +
    `--b--\r\nThis is epilogue text that should be ignored`
  );
  
  const result = parseFormData(body, boundary);
  expect(result).toEqual({ field: 'value' });
});
```

## Testing Patterns & Best Practices

### Deterministic Fixtures

Use explicit buffers and strings; **never** use `Math.random()`, timestamps, or the network.

```typescript
// ✅ Good: Deterministic, repeatable
const body = Buffer.from(`--boundary\r\n...`);

// ❌ Bad: Non-deterministic
const body = Buffer.alloc(Math.random() * 1000);
```

### Exact Assertions

Assert exact values, not approximate or partial.

```typescript
// ✅ Good: Exact field value
expect(result.username).toBe('alice');

// ❌ Bad: Vague assertion
expect(result).toBeDefined();

// ✅ Good: Exact error type and message
expect(() => fn()).toThrow(TypeError, /boundary invalid/);

// ❌ Bad: Only type
expect(() => fn()).toThrow();
```

### Test Isolation

Each test is independent; no shared state between tests.

```typescript
// ✅ Good: Each test has its own boundary and body
describe('parseFormData', () => {
  it('test 1', () => { const body = Buffer.from(...); });
  it('test 2', () => { const body = Buffer.from(...); });
});

// ❌ Bad: Shared state
let body;
describe('parseFormData', () => {
  beforeAll(() => { body = Buffer.from(...); });
  it('test 1', () => { expect(fn(body)).toBe(...); });
  it('test 2', () => { expect(fn(body)).toBe(...); });
});
```

### Edge Case Names

Use clear, descriptive test names that indicate the edge case.

```typescript
// ✅ Good
it('throws RangeError if boundary exceeds 1024 bytes');
it('returns empty object for form with no fields');
it('handles filename without extension correctly');

// ❌ Bad
it('test boundary');
it('edge case 1');
it('should work');
```

## Commands

```bash
# Run all tests
yarn test

# Watch mode (re-run on file change)
yarn test:watch

# Run specific test file
yarn test src/libs/multipart/multipart.test.ts

# Filter by test name
yarn test -t "boundary detection"

# Verbose output
yarn test --reporter=verbose

# Coverage report
yarn coverage

# Coverage HTML report
yarn coverage
open coverage/index.html
```

## Common Pitfalls

| Pitfall                                   | Fix                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------- |
| Test uses `Math.random()`                 | Replace with seeded RNG or fixed test data                            |
| Assertion is too vague (`expect(...).toBeDefined()`) | Assert exact value: `expect(...).toBe(expectedValue)` |
| Test depends on other tests               | Each test must be independent; use fresh fixtures                     |
| Error message assertion is too broad      | Use `toThrow(ErrorType, /specific pattern/)` for precision            |
| Coverage drops below 95%                  | Add missing test cases; do not lower threshold                        |
| Test file not found                       | Check file name (`*.test.ts`), path, and `vitest.config.ts` glob      |
| Test times out                            | Add `{ timeout: 10000 }` to `it()` if intentionally slow; else debug  |
| Buffer comparison fails unexpectedly      | Use `toEqual()` for deep comparison, not `toBe()` (reference equality) |

## When to Write Tests

- **Before implementation:** TDD approach (test first, code second).
- **With new features:** Every feature needs test coverage.
- **With bug fixes:** Add test that reproduces the bug, then fix.
- **Before refactoring:** Tests verify behavior is preserved.
- **Coverage gaps:** Coverage reports show untested paths.

## Code Coverage Thresholds

- **Statements:** 95% — Virtually all code paths executed.
- **Functions:** 95% — Almost all functions called.
- **Lines:** 95% — Almost all lines of code executed.
- **Branches:** 75% — Most conditional branches tested (pragmatic because `noUncheckedIndexedAccess` makes some branches unreachable).

Run `yarn coverage` to generate a report; view with `open coverage/index.html`.
