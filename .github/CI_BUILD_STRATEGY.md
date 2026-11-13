# CI Build Strategy: Optional Dependencies

## Executive Summary

This project uses a **zero-dependency core** with optional framework and storage backend integrations. The GitHub workflows have been updated to:

1. **Install specified optional dependencies during CI** to ensure all code paths are tested and type-checked
2. **Let end users install dependencies on their side** for their specific use cases
3. **Keep the core library lightweight and dependency-free** for users who only need the base parsing functionality

## What Gets Installed During CI Build

### Always Installed
- All `devDependencies` (build tools, linters, test runners, etc.)
- The core library code

### Installed for CI Testing (Optional Dependencies)
```json
{
  "express": "^4.0.0",
  "@azure/storage-blob": "^12.0.0",
  "@aws-sdk/client-s3": "^3.0.0",
  "@nestjs/common": "^10.0.0"
}
```

These are installed to:
- Validate that all optional module exports compile correctly
- Run comprehensive tests that exercise all features
- Verify type definitions for optional integrations
- Ensure the library works with the latest versions of these frameworks

### Never Installed
- Optional dependencies are marked in `package.json` so they don't automatically install for end users
- Users only install what they need for their use case

## Build Workflow Steps

1. **Node.js Setup** - Use pinned Node version from `.nvmrc`
2. **Yarn Setup** - Initialize Corepack and install Yarn
3. **Install DevDependencies** - `yarn install --immutable`
4. **Install Optional Dependencies** - Only the 4 specified packages
5. **Build & Test** - Compile, test, lint, and type-check with full dependency access

## End User Installation Guide

### For Core Functionality Only
```bash
npm install @xkid1/multipart
```
- Only gets the core zero-dependency library
- Can use: local file storage, core multipart parsing
- Cannot use: Express middleware, NestJS middleware, AWS S3, Azure Blob

### For Express Integration
```bash
npm install @xkid1/multipart express
```
- Adds Express middleware support
- Can import from: `@xkid1/multipart/middleware/express`

### For NestJS Integration
```bash
npm install @xkid1/multipart @nestjs/common
```
- Adds NestJS middleware support
- Can import from: `@xkid1/multipart/middleware/nestjs`

### For AWS S3 Storage
```bash
npm install @xkid1/multipart @aws-sdk/client-s3
```
- Adds S3 upload support
- Can import from: `@xkid1/multipart/storage/s3`

### For Azure Blob Storage
```bash
npm install @xkid1/multipart @azure/storage-blob
```
- Adds Azure Blob Storage support
- Can import from: `@xkid1/multipart/storage/azure`

### For All Features
```bash
npm install @xkid1/multipart express @aws-sdk/client-s3 @azure/storage-blob @nestjs/common
```

## Why This Approach?

### Benefits for Users
✅ **Minimal Installation** - Users only install what they need  
✅ **No Bloat** - Core library remains lightweight (zero dependencies)  
✅ **Clear Dependencies** - Explicit about which features need which packages  
✅ **Framework Flexibility** - Support multiple frameworks without coupling  

### Benefits for Maintainers
✅ **Comprehensive Testing** - CI tests all code paths with dependencies present  
✅ **Version Validation** - Ensures compatibility with supported versions  
✅ **Breaking Change Detection** - Quickly identify incompatibilities  
✅ **User Choice** - Don't force dependencies on users who don't need them  

## CI Workflow Files

### `.github/actions/setup/action.yml`
Composite action that:
1. Sets up Node.js
2. Initializes Corepack
3. Installs all devDependencies
4. Installs the 4 optional dependencies

### `.github/workflows/build.yml`
Compiles the TypeScript library with all optional dependencies available.

### `.github/workflows/test.yml`
Runs unit tests with full feature coverage.

### `.github/workflows/code-conventions.yml`
Validates formatting, linting, and type-checking with optional dependencies available.

### `.github/workflows/ci.yml`
Orchestrates the full CI pipeline.

### `.github/workflows/publish.yml`
Prepares the package for publication with optional dependencies handled correctly.

## Module Architecture

| Module | Required | Optional | Use Case |
|--------|----------|----------|----------|
| Core Parser | - | - | All |
| Express Middleware | express | - | Express.js apps |
| NestJS Middleware | @nestjs/common | - | NestJS apps |
| Local Storage | - | - | File-system storage |
| S3 Storage | @aws-sdk/client-s3 | - | AWS integration |
| Azure Storage | @azure/storage-blob | - | Azure integration |

## Preventing Build Failures

The setup action uses `continue-on-error` in certain steps to ensure:
- CI doesn't fail on minor warnings from optional dependencies
- If a specific optional dependency has issues, it's clearly logged but doesn't block the build
- All core functionality is validated regardless

## Validation

To verify this setup locally:

```bash
# Simulate CI environment
yarn install --immutable
yarn add --optional express @azure/storage-blob @aws-sdk/client-s3 @nestjs/common

# Run full validation
yarn check  # Runs format:check, lint, typecheck, coverage, build

# Test without optional dependencies (should fail gracefully)
rm node_modules/@aws-sdk node_modules/@azure node_modules/express node_modules/@nestjs
yarn test   # May have reduced test coverage
yarn build  # Should still compile core
```

## Future Changes

If new optional dependencies are added:
1. Update `package.json` with new optional dependency
2. Update `.github/actions/setup/action.yml` to install it
3. Update this documentation
4. Ensure new modules have proper error handling for missing dependencies
5. Add tests that validate graceful degradation

## Troubleshooting

### Build fails with "Cannot find module 'express'"
This is expected in user environments. They should install: `npm install express`

### CI build fails unexpectedly
Check `.github/actions/setup/action.yml` to ensure all optional dependencies are properly installed.

### Tests pass locally but fail in CI
Ensure you're running with optional dependencies installed:
```bash
yarn add --optional express @azure/storage-blob @aws-sdk/client-s3 @nestjs/common
```

## Related Files
- [WORKFLOW_UPDATES.md](../../WORKFLOW_UPDATES.md) - Detailed changelog of workflow updates
- [package.json](../../package.json) - Dependency definitions
- Contributing.md - How to contribute with this setup
