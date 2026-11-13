# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you believe you have found a security vulnerability in `@xkid1/multipart`, **please do not open a public GitHub issue**. Instead, please report the vulnerability responsibly by emailing us with details.

### How to Report

When reporting a security vulnerability, please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce the issue (if applicable)
- The affected version(s) of the library
- Any suggested remediation or fix (if available)

We will acknowledge receipt of your report within 48 hours and provide an expected timeline for a fix.

## Security Considerations

### Zero-Dependency Design
This library maintains **zero runtime dependencies**, which significantly reduces the attack surface and dependency-related vulnerabilities. All parsing logic is implemented in pure TypeScript.

### Buffer Handling
The library performs direct byte-level operations on Node.js `Buffer` objects. Users should ensure:
- Input buffers come from trusted sources
- Proper size limits are enforced on uploaded content
- Memory constraints are considered when processing large multipart payloads

### Encoding Validation
The built-in encoding detector validates UTF-8, UTF-16, UTF-32, ASCII, and Latin-1 sequences. Binary data is handled safely without conversion assumptions. Encoding detection includes BOM analysis and multi-byte validation to prevent encoding-based injection vectors.

### Input Validation
When parsing multipart form data:
- Validate file sizes and count before processing
- Implement rate limiting on multipart uploads
- Validate file extensions and MIME types after parsing
- Handle malformed boundaries and headers gracefully

## Supported Versions

| Version | Status        | Security Updates |
|---------|---------------|-----------------|
| 0.2.x   | Current       | Yes             |
| 0.1.x   | Maintenance   | Critical only   |

Only the current and previous minor versions receive security updates.

## Responsible Disclosure

We practice responsible disclosure:
- We will not publicly disclose the vulnerability until a fix is available
- We will credit the reporter (unless anonymity is preferred)
- We will work with you to determine a reasonable timeline for disclosure
- Security patches will be released as soon as possible

## Compliance & Standards

This library follows Node.js and web security best practices:
- Secure parsing of RFC 2388 (multipart form data) and RFC 7578
- Compliance with OWASP guidelines for input validation
- Memory-safe buffer operations using Node.js Buffer API
- No use of unsafe functions or deprecated APIs

## Version Support

For version support and security patching timelines, see [package.json](./package.json).

## Questions?

If you have questions about this security policy or need clarification, please contact the maintainers through the appropriate channels.
