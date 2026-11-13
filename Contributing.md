# Contributing to @xkid1/multipart

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How to Contribute

### Reporting Bugs

Before reporting a bug:
1. Check the [existing issues](https://github.com/xkid1/multipart/issues) to avoid duplicates
2. Verify the bug exists in the latest version
3. Test on multiple Node.js versions (we support Node.js >= 26.13.0)

When reporting a bug, include:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (Node.js version, OS, etc.)
- A minimal reproducible example if possible

### Suggesting Features

Feature suggestions are welcome! Before proposing:
1. Check if the feature has been suggested already
2. Explain the use case and expected behavior
3. Consider how it aligns with the library's philosophy (zero dependencies, lightweight, RFC-compliant)

We prioritize features that:
- Enhance RFC 2388/7578 compliance
- Improve performance without adding dependencies
- Maintain backward compatibility
- Have clear use cases

### Submitting Code Changes

#### Prerequisites
- Node.js >= 26.13.0
- Yarn 4.18.0 (enforced via Corepack)
- Git knowledge (commits, branches, pull requests)

#### Setup
```bash
# Clone the repository
git clone https://github.com/xkid1/multipart.git
cd multipart

# Install dependencies
yarn install

# Create a feature branch
git checkout -b feature/your-feature-name
```

#### Development Workflow

1. **Make your changes** following the coding standards below
2. **Run the validation pipeline**:
   ```bash
   yarn check  # Runs format, lint, typecheck, coverage, and build
   ```
3. **Run tests during development**:
   ```bash
   yarn test:watch  # Interactive testing
   ```
4. **Format and fix issues**:
   ```bash
   yarn format      # Auto-format code
   yarn lint:fix    # Auto-fix linting issues
   ```

#### Coding Standards

- **TypeScript**: Maintain strict type safety; avoid `any`
- **Imports**: Use ESM syntax (`import type`, `import`)
- **Comments**: Only comment code that needs clarification
- **Line Length**: Prefer readability; ESLint enforces max-line-length
- **Null Checks**: Maintain strict null checks (`tsconfig.json`)
- **Return Types**: Always include explicit return types on exported functions

Example:
```typescript
/**
 * Parse multipart form data from a buffer.
 * @param buffer The raw HTTP request body buffer
 * @param boundary The multipart boundary string
 * @returns An array of parsed form fields
 */
export function parseMultipart(buffer: Buffer, boundary: string): FormField[] {
  // Implementation
}
```

#### Testing Requirements

Every bug fix and feature **must include corresponding tests**:
- Add tests to existing test files in `src/` (e.g., `src/parser.test.ts`)
- Aim for high signal-to-noise ratio; test behavior, not implementation details
- Include edge cases (empty fields, large files, special characters, encoding variations)
- Run `yarn coverage` to verify coverage

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { parseMultipart } from './parser';

describe('parseMultipart', () => {
  it('should parse simple form fields', () => {
    const buffer = Buffer.from('...');
    const result = parseMultipart(buffer, 'boundary');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('field');
  });

  it('should handle UTF-8 encoded values', () => {
    // Test with UTF-8 content
  });
});
```

#### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `docs:` - Documentation
- `chore:` - Build, dependencies, tooling

Example:
```
feat: add support for RFC 7578 multipart filename extensions

- Parse RFC 7578 filename* parameter for non-ASCII filenames
- Add tests for UTF-8 and ISO-8859-1 encoded filenames
- Update documentation with encoding handling details
```

#### Pull Request Process

1. **Create a PR** from your feature branch to `main`
2. **Provide a clear title and description**:
   - Link related issues (`Fixes #123`)
   - Explain the change and why it's needed
   - Highlight any breaking changes
3. **Ensure CI passes**:
   - All checks must pass (linting, types, tests, coverage)
   - Code coverage should not decrease
4. **Address review feedback** promptly
5. **Once approved**, your PR will be merged by a maintainer

### Documentation

Documentation improvements are always welcome:
- Update [README.md](./README.md) for user-facing changes
- Add JSDoc comments to exported functions
- Include examples for new features
- Keep documentation in sync with code changes

## Project Architecture

### Core Components
- **Parser** (`src/parser.ts`): RFC-compliant multipart parsing
- **Encoding Detector** (`src/encoding.ts`): Multi-encoding support (UTF-8/16/32, ASCII, Latin-1, binary)
- **Middleware** (`src/middleware/`): Express/NestJS integration
- **Storage** (`src/storage/`): Local, S3, and Azure Blob support

### Key Principles
1. **Zero Runtime Dependencies**: All parsing is pure TypeScript
2. **Buffer Safety**: Direct byte operations with no assumptions about memory
3. **RFC Compliance**: Strict adherence to RFC 2388 and RFC 7578
4. **Performance**: Optimized for typical multipart payloads without sacrificing correctness

### Directory Structure
```
src/
├── index.ts              # Main export
├── parser.ts             # Core parsing logic
├── encoding.ts           # Encoding detection
├── types.ts              # Type definitions
├── middleware/           # Framework middleware
│   ├── express/
│   └── nestjs/
├── storage/              # Storage adapters
│   ├── local/
│   ├── s3/
│   └── azure/
└── *.test.ts             # Test files
```

## Development Tools

- **Build**: SWC (JavaScript compiler) + TypeScript (type checking)
- **Linting**: ESLint with TypeScript and security plugins
- **Formatting**: Prettier
- **Testing**: Vitest with V8 coverage
- **Type Checking**: TypeScript compiler

## Maintenance & Releases

Releases follow [Semantic Versioning](https://semver.org/):
- **Patch** (0.0.x): Bug fixes, security patches
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

Security patches are prioritized; typically released within 48 hours of confirmation.

## Questions?

- Check existing [issues](https://github.com/xkid1/multipart/issues) and [discussions](https://github.com/xkid1/multipart/discussions)
- Maintainer contact available in the repository

## License

By contributing, you agree that your contributions will be licensed under the MIT License (see [LICENSE](./LICENSE)).

---

Thank you for making @xkid1/multipart better! 🎉
