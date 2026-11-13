# GitHub Workflow Updates - Optional Dependencies Strategy

## Overview
Updated all GitHub Actions workflows in `.github/workflows/` to support a clean build environment where only specified optional dependencies are installed during CI/CD, while end users can install them on their side as needed.

## Changes Made

### 1. **package.json** - Added Optional Dependencies
```json
"optionalDependencies": {
  "@aws-sdk/client-s3": "^3.0.0",
  "@azure/storage-blob": "^12.0.0",
  "@nestjs/common": "^10.0.0",
  "express": "^4.0.0"
}
```

**Rationale:**
- These are framework-specific integrations (Express, NestJS) and cloud storage backends (AWS S3, Azure Blob)
- Marking them as optional allows the core library to work without these dependencies
- Users importing specific modules (e.g., `/middleware/express`) need only install the relevant optional dependency

### 2. **.github/actions/setup/action.yml** - Updated Setup Action

**Changes:**
- Installs all dev dependencies with `yarn install --immutable`
- Adds a second step to install only the 4 specified optional dependencies
- Gracefully handles installation warnings/errors to prevent CI failures

**Key Steps:**
```bash
# Installs the specified optional dependencies for CI build
yarn add --optional express @azure/storage-blob @aws-sdk/client-s3 @nestjs/common
```

### 3. **.github/workflows/build.yml** - Build Workflow
- Simplified to use the standard setup action
- Build pipeline remains clean and focused on compilation
- Optional dependencies are now available during the build process

### 4. **.github/workflows/test.yml** - Test Workflow
- Updated to include explicit error handling
- Tests now have access to optional dependencies for comprehensive testing
- `continue-on-error: false` ensures tests must pass

### 5. **.github/workflows/code-conventions.yml** - Code Conventions
- Updated type-checking step with better error handling
- Optional dependencies available during type-checking for proper type validation
- Ensures all type definitions are properly resolved

## Workflow Files Structure

### CI Pipeline (`.github/workflows/ci.yml`)
- Orchestrates build, test, and code-conventions jobs
- All jobs now have access to optional dependencies through updated setup action
- Maintains proper dependency ordering and error reporting

### Other Workflows
- **pr-labeler.yml** - Automatically labels PRs based on file changes (unchanged)
- **pr-welcome.yml** - Welcomes first-time contributors (unchanged)
- **publish.yml** - Handles package publication to npm and GitHub Packages

## Build Behavior

### CI Environment
During CI/CD runs:
1. Node.js and Yarn are set up
2. All devDependencies are installed
3. The 4 optional dependencies are installed for comprehensive testing and type-checking
4. Build, test, and lint processes have full dependency access
5. Build does not fail if optional dependencies have warnings

### End User Environment
When users install the package:
```bash
npm install @xkid1/multipart
```

- Only devDependencies are excluded (as is standard)
- Optional dependencies are suggested but not required
- Users can install specific optional dependencies as needed:
  ```bash
  npm install express
  # or
  npm install @azure/storage-blob
  # or
  npm install @aws-sdk/client-s3
  # or
  npm install @nestjs/common
  ```

## Module-Level Dependency Resolution

The package provides multiple export points:

| Export | Required Dependency | Optional |
|--------|-------------------|----------|
| `@xkid1/multipart` | None | No |
| `@xkid1/multipart/middleware/express` | `express` | Yes |
| `@xkid1/multipart/middleware/nestjs` | `@nestjs/common` | Yes |
| `@xkid1/multipart/storage/s3` | `@aws-sdk/client-s3` | Yes |
| `@xkid1/multipart/storage/azure` | `@azure/storage-blob` | Yes |
| `@xkid1/multipart/storage/local` | None | No |

Users only need to install optional dependencies for the modules they use.

## Testing & Validation

All workflows have been updated to:
1. ✅ Handle optional dependency installation gracefully
2. ✅ Provide clear error messages if something fails
3. ✅ Allow CI to pass even if optional dependencies have minor warnings
4. ✅ Ensure comprehensive testing with optional dependencies available

## Zero-Dependency Core Principle

The core library remains **zero-dependency**:
- Core parsing functionality (`src/middleware/core/parse-multipart.ts`)
- Local file storage (`src/storage/local/index.ts`)
- All utilities in `src/utils/`
- These can be used without any optional dependencies

## Future Maintenance

When maintaining these workflows:
1. Keep the 4 optional dependencies in sync across all files if they change
2. Test both with and without optional dependencies locally before pushing
3. Ensure new features don't accidentally create hard dependencies
4. Document any new framework integrations as optional dependencies

## Quick Reference

**To test locally with the same setup as CI:**
```bash
# Install all dependencies (like CI does)
yarn install --immutable

# Then install optional dependencies
yarn add --optional express @azure/storage-blob @aws-sdk/client-s3 @nestjs/common

# Run the full check suite
yarn check
```

**To test without optional dependencies:**
```bash
# Install only dev dependencies
yarn install --immutable

# Run tests (may skip tests that require optional deps)
yarn test

# Build without optional dependencies
yarn build
```
