# Security Policy

## Reporting a vulnerability

**Please don't report security issues in public GitHub issues, discussions or pull requests.**

Report them privately through GitHub:
[**Report a vulnerability**](https://github.com/xkid1/multipart/security/advisories/new)
(repository **Security** tab → **Report a vulnerability**).

Please include:

- the affected version(s) and entry point (parser, Express, NestJS, local/S3/Azure storage);
- a description of the issue and its impact;
- a minimal reproduction, such as a request body or script (no real credentials, please);
- a suggested fix, if you have one.

What to expect:

- an acknowledgement within **48 hours**, and an expected timeline for a fix;
- coordinated disclosure: a fix is released before details are published, with a GitHub
  Security Advisory (and a CVE where appropriate) crediting you unless you prefer otherwise.

## Supported versions

The package is pre-1.0. Security fixes are released for the **latest minor version** only.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Scope

In scope: anything in this package that a malicious **request** or **filename** can trigger,
for example:

- crashes, hangs or unbounded memory/CPU use while reading or parsing a body;
- limits (`maxSize`, `fileSize`, `fieldSize`, `maxFiles`, `maxFields`, `allowedMimeTypes`)
  that can be bypassed;
- prototype pollution through field names;
- path traversal or file overwrites in local storage;
- storage helpers granting more access than documented (for example SAS URL permissions).

Out of scope: vulnerabilities in Express, NestJS, the AWS or Azure SDKs, or Node.js itself
(report those upstream), and insecure application configuration, such as disabling limits.

## What the library does for you

- **Limits by default**: a 100 MiB body, 50 MiB per file, 10 MiB per field, 100 files and
  1000 fields. The body limit is enforced **while streaming**, so an oversized request is
  rejected without being fully read.
- **No prototype pollution**: results have a `null` prototype, so a field named
  `__proto__` or `constructor` is plain data.
- **Safe local storage**: client filenames are reduced to a basename (no `../`, no
  absolute paths, no control characters), all paths are checked to stay inside the
  configured directory, and existing files are never silently overwritten.
- **Read-only SAS URLs by default** for Azure; S3 objects get no ACL unless you set one.
- **No secrets in logs**: the `debug` option logs field names and sizes, never values.
- **Zero runtime dependencies** in the core package.

## What you still need to do

- **Don't trust `mimeType` or `name`.** Both come from the client. `allowedMimeTypes` checks
  the type the client *declared*, not the file's content. If the type matters, check the
  content itself (for example its magic bytes), and never use the client filename as a
  path without the storage helpers.
- **Serve uploads safely.** Files are stored with an `inline` Content-Disposition by default.
  If you serve user uploads from your own domain, an uploaded HTML or SVG file can run
  script there (stored XSS). Serve them from a separate domain, or set
  `contentDisposition: 'attachment'` and `X-Content-Type-Options: nosniff`.
- **Size limits to your memory.** Bodies are buffered in memory up to `maxSize`, so
  concurrent uploads × `maxSize` must fit in memory. Lower `maxSize` to what you actually
  need, and add authentication and rate limiting in front of upload routes.
- **Keep uploads out of executable paths.** Don't point local storage at a directory your
  web server executes or serves as code.
- **Protect storage credentials.** Use IAM roles or managed identity where you can, keep
  buckets and containers private, and give presigned and SAS URLs short expiry times.
