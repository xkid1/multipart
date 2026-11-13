# Accessibility Statement

## Overview

`@xkid1/multipart` is a backend library for parsing multipart form-data. As a server-side, non-visual library, it does not directly provide user interface elements. However, we are committed to ensuring the library and all associated documentation are as accessible as possible.

## Documentation Accessibility

### Website & README
- **Semantic HTML**: Repository documentation uses clear semantic structure
- **Readable Text**: High contrast, sans-serif fonts in documentation
- **Logical Heading Structure**: H1 → H2 → H3 hierarchy for document navigation
- **Code Examples**: Syntax highlighting with sufficient color contrast
- **Links**: Descriptive link text (avoid "click here" patterns)

### API Documentation
- **JSDoc Comments**: All exported functions have detailed JSDoc comments
- **Type Definitions**: Complete TypeScript type information for IDE support
- **Error Messages**: Clear, actionable error messages to aid debugging
- **Examples**: Multiple usage examples in docs for different use cases

## Code & Development

### Source Code
- **Type Safety**: Full TypeScript strict mode prevents runtime errors
- **Clear Naming**: Self-documenting variable and function names
- **Comments**: Non-obvious logic is explained with comments
- **ESLint Rules**: Security and best-practice linting for code quality

### Testing
- **Comprehensive Test Suite**: Vitest with high coverage to catch regressions
- **Test Names**: Descriptive test names that explain expected behavior
- **Error Scenarios**: Tests cover edge cases and error conditions

## CLI & Build Tools

### Commands
All development commands are documented:
```bash
yarn build       # Build the library
yarn test        # Run tests
yarn lint        # Check code quality
yarn typecheck   # Type check without emitting
yarn format      # Auto-format code
```

### Error Output
- **Clear Messages**: Build/test failures include helpful context
- **Line Numbers**: Error references include file and line numbers
- **Stack Traces**: Full stack traces for debugging

## Dependency Management

### Zero External Dependencies
- No external libraries to evaluate for accessibility
- Smaller bundle size, faster download, reduced complexity
- All functionality built on Node.js core APIs (Buffer, Streams, etc.)

## Language & Terminology

- **Plain Language**: Documentation avoids unnecessary jargon
- **Consistent Terms**: Technical terms are used consistently
- **Abbreviations**: Spelled out on first use (e.g., "RFC 2388 (Request for Comments)")
- **International**: No region-specific references; standards are global

## Keyboard Navigation & Automation

### GitHub Integration
- **Issue Templates**: Structured templates guide bug and feature reporting
- **CI/CD**: Automated checks ensure code quality
- **PR Reviews**: Clear review requirements and status checks

### Development Environment
- Full support for terminal-based development
- Can be integrated into any IDE or text editor
- No GUI requirements; works with keyboard-only workflows

## Known Limitations

1. **Visual Examples**: Repository doesn't include visual diagrams (future improvement)
2. **Multi-Language Docs**: Currently English-only (contribution welcome)
3. **Interactive Demos**: Library is code-only; no interactive playground

## Accessibility Testing

We test accessibility in:
- **Code Quality**: ESLint with accessibility-aware rules
- **Type Safety**: TypeScript strict mode catches potential issues
- **Documentation**: Markdown files validated for structure and links
- **CI/CD**: All checks run on every commit

## Feedback & Improvements

If you encounter accessibility barriers:
1. Review [SECURITY.md](./SECURITY.md) for reporting guidelines
2. Open an [issue](https://github.com/xkid1/multipart/issues) describing the barrier
3. Suggest improvements in the issue or via pull request

Include:
- Description of the accessibility barrier
- Affected area (code, docs, tools)
- Suggested solution (if any)
- Your assistive technology (if applicable)

## Standards & References

This accessibility statement adheres to:
- **WCAG 2.1**: Web Content Accessibility Guidelines
- **Section 508**: U.S. Federal Accessibility Requirements
- **EN 301 549**: European Accessibility Standard

## Continuous Improvement

Accessibility is an ongoing commitment:
- Regular review of documentation and tooling
- Community feedback and contributions
- Updates to reflect best practices
- Testing with diverse workflows and tools

---

**Last Updated**: November 2026

For questions or accessibility-related requests, please open an [issue](https://github.com/xkid1/multipart/issues) or contact the maintainers.
