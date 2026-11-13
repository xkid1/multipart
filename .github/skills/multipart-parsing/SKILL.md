---
name: multipart-parsing
description: Parse RFC-compliant multipart form-data from raw HTTP buffers. Extract boundaries, headers (name, filename, MIME type, extension), handle encoding detection (BOM, UTF-8/16/32, ASCII/Latin-1, binary), and ensure zero-copy buffer slicing and memory safety.
---

# Skill: Multipart Form-Data Parsing & Encoding Inspection

## Description

Expertise in parsing **RFC 2046** and **RFC 2388** multipart form-data from raw HTTP request buffer payloads. Core responsibilities include:

1. Locating and validating multipart boundaries (RFC-compliant format: `\r\n--<boundary>` and `\r\n--<boundary>--\r\n`).
2. Extracting and parsing MIME headers (`Content-Disposition`, `Content-Type`) to recover field names, uploaded filenames, MIME types, and file extensions.
3. Detecting and handling character encoding across text fields and binary file uploads (BOM inspection, UTF-8/16/32 validation, ASCII/Latin-1, binary fallback).
4. Implementing zero-copy buffer operations (`Buffer.prototype.subarray`, `Buffer.prototype.indexOf`) for memory efficiency on large multipart payloads.
5. Validating part boundaries and handling edge cases (missing final boundary, malformed headers, oversized fields).

## Key Logic Areas

### 1. Boundary Detection & Location

| Task                                          | Implementation                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Find boundary start position                  | `Buffer.prototype.indexOf(boundaryBuffer)` (case-sensitive)                                        |
| Validate boundary format                      | Boundary must be preceded by `\r\n--` and followed by `\r\n` or end-of-file                       |
| Handle final boundary                         | Final boundary ends with `--` and optional final `\r\n`                                            |
| Extract part between boundaries               | Use `subarray(start, end)` to slice without allocation                                             |
| Respect boundary size limit                   | Maximum boundary length: 1024 bytes (including CRLF and dashes)                                    |

**Code patterns:**
```typescript
// ✅ Find next boundary efficiently
const boundaryIndex = body.indexOf(boundaryBuffer);
if (boundaryIndex === -1) { /* no more parts */ }

// ✅ Zero-copy slice for part extraction
const part = body.subarray(startIndex, endIndex);

// ❌ Avoid allocation (wasteful)
// const part = body.slice(startIndex, endIndex);
```

### 2. Header Parsing & Extraction

| Header                     | Extract                                                              | Example                                                                   |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Content-Disposition`      | Field `name`, uploaded `filename`, charset (RFC 2047 if present)     | `form-data; name="file"; filename="avatar.png"`                          |
| `Content-Type`             | MIME type and optional charset                                       | `image/png; charset=utf-8`                                               |
| File extension             | Extract from `filename` (safe: handle missing extension)             | `"avatar.png"` → `".png"`, `"README"` → `""` (not `"README"`)            |
| Field name                 | Extract from `name` parameter                                       | `name="username"` → `username`                                            |

**Edge cases to handle:**
- Quoted strings: `filename="avatar.png"` vs `filename=avatar.png`
- RFC 2047 encoded filenames: `filename*=UTF-8''avatar%20pic.png`
- Missing extension: Safely return empty string (not filename as extension).
- Non-ASCII filenames (UTF-8 decoded).
- Duplicate headers (use first occurrence).

**Code patterns:**
```typescript
// ✅ Safe extension extraction
const parts = filename.split('.');
const extension = parts.length > 1 ? `.${parts[parts.length - 1]}` : '';

// ❌ Unsafe (assumes extension exists)
// const extension = `.${filename.split('.').pop()}`;  // crashes if no extension

// ✅ Handle quoted strings
const unquoted = disposition.replace(/^"(.*)"$/, '$1');
```

### 3. Header/Body Separation

| Concern                    | Implementation                                                                 |
| -------------------------- | ------------------------------------------------------------------------------ |
| Find CRLF CRLF separator   | `body.indexOf(Buffer.from('\r\n\r\n'))` marks header-body boundary            |
| Split headers and body     | Headers: `subarray(0, headerEndIndex)`, Body: `subarray(headerEndIndex + 4)` |
| Parse headers line by line | Split on `\r\n`, extract key-value pairs                                      |
| Handle missing separator   | Part is invalid if no `\r\n\r\n` found; skip or throw `TypeError`            |

**Code patterns:**
```typescript
// ✅ Safe header/body split
const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
if (headerEndIndex === -1) {
  throw new TypeError('part is missing header/body separator');
}
const headers = part.subarray(0, headerEndIndex);
const body = part.subarray(headerEndIndex + 4);
```

### 4. Encoding Detection

| Encoding     | Detection Method                                                          | Fallback Behavior     |
| ------------ | -------------------------------------------------------------------------- | --------------------- |
| UTF-8        | BOM (`EF BB BF`) or valid multi-byte sequences (U+0080–U+10FFFF)         | Assume if no BOM      |
| UTF-16 BE    | BOM (`FE FF`)                                                             | Decode or fallback    |
| UTF-16 LE    | BOM (`FF FE`)                                                             | Decode or fallback    |
| UTF-32       | BOM (`FE FF 00 00` BE or `00 00 FF FE` LE)                                | Decode or fallback    |
| ASCII        | All bytes in range 0x00–0x7F                                              | Subset of UTF-8       |
| Latin-1      | Bytes 0x80–0xFF (interpreted as ISO-8859-1)                              | Fallback for non-UTF  |
| Binary       | No valid UTF encoding and no ASCII/Latin-1 interpretation possible       | Return as-is or flag  |

**Validation rules:**
- UTF-8 multi-byte sequences must be valid: `11xxxxxx 10xxxxxx` (1–4 bytes per character).
- Reject overlong sequences (e.g., `C0 80` encoding U+0000).
- BOM presence is optional; encoding can be inferred from byte patterns.

**Code patterns:**
```typescript
// ✅ Check for UTF-8 BOM
if (buffer.subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]))) {
  return 'utf-8'; // BOM present
}

// ✅ Validate multi-byte UTF-8
const isValidUtf8 = (buf) => {
  for (let i = 0; i < buf.length; ) {
    const byte = buf[i];
    if ((byte & 0x80) === 0) i++; // ASCII
    else if ((byte & 0xE0) === 0xC0) i += 2; // 2-byte
    else if ((byte & 0xF0) === 0xE0) i += 3; // 3-byte
    else if ((byte & 0xF8) === 0xF0) i += 4; // 4-byte
    else return false;
  }
  return true;
};
```

### 5. Part Validation & Skipping

| Check                        | Rationale                                                      |
| ---------------------------- | -------------------------------------------------------------- |
| Skip prologue (before first) | First boundary may be preceded by preamble; ignore it         |
| Skip epilogue (after final)  | Content after final boundary (`\r\n--<boundary>--`) is ignored |
| Empty parts                  | Valid but may represent missing fields                         |
| Duplicate field names        | Use first occurrence (HTTP convention); later ones are ignored |
| Oversized boundaries         | Reject if boundary > 1024 bytes (protect against DoS)         |

## Architecture & Module Organization

```
src/utils/multipart/
├── parse-headers/
│   ├── parse-headers.ts      # Main header parser
│   ├── extract-name.ts        # Extract field name
│   ├── extract-filename.ts    # Extract uploaded filename
│   ├── extract-mime-type.ts   # Extract MIME type
│   ├── extract-extension.ts   # Extract file extension (safe)
│   └── index.ts               # Barrel export
├── parse-parts/
│   ├── find-next-boundary.ts  # Find boundary position
│   ├── extract-part.ts        # Extract part between boundaries
│   ├── split-part-sections.ts # Split headers from body
│   ├── should-skip-part.ts    # Validate part eligibility
│   └── index.ts               # Barrel export
└── index.ts                   # Root export (parse-headers + parse-parts)
```

Each module has a single responsibility and 8–30 lines of focused code.

## Testing Strategy

| Area                                  | Cases                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Boundary detection                    | Valid, missing final, oversized, empty, nested (invalid)               |
| Header extraction                     | Valid disposition, missing name/filename, quoted strings, RFC 2047     |
| Encoding detection                    | UTF-8 (with/without BOM), UTF-16, Latin-1, binary, partial sequences  |
| File extension extraction             | `.png`, `.tar.gz`, no extension (README), special chars                |
| Part validation                       | Valid parts, malformed headers, missing header/body separator          |
| Integration                           | Multi-field forms, mixed text/binary, large files, empty fields        |
| Edge cases                            | Empty buffer, single-byte parts, corrupted CRLF, oversized boundaries |

**Pattern:** Seeded deterministic inputs, no mocks, assert exact field values.

## Commands & Validation

```bash
yarn check                  # format, lint, typecheck, coverage, build
yarn test                   # Vitest run multipart tests
yarn coverage               # Coverage report (thresholds 95/95/95, 75 branches)
yarn lint                   # ESLint on src/utils/multipart/
yarn typecheck              # tsc --noEmit
```

## Common Pitfalls

| Pitfall                                        | Fix                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| Using `.slice()` instead of `.subarray()`      | Switch to zero-copy `subarray()` on large buffers                   |
| Hardcoding extension from split without check | Check array length before accessing; return `''` if no extension    |
| Assuming boundary always exists                | Check `indexOf` return value (`-1` if not found)                    |
| Mutating input buffer                          | Return new `Buffer` or `Uint8Array`; never mutate arguments         |
| Forgetting CRLF bytes in offset calculations   | Boundary CRLF = 2 bytes, header/body CRLF CRLF = 4 bytes           |
| Incomplete BOM checks                          | Test all 4 UTF variants (8, 16 BE, 16 LE, 32) and ASCII/Latin-1    |
| Over-trusting encoding detection               | Log encoding uncertainty for ambiguous cases; default to UTF-8      |
| Not handling duplicate headers                 | Use first occurrence; log warning for duplicates                     |
| Not validating boundary length                 | Reject boundaries > 1024 bytes with descriptive `TypeError`         |
