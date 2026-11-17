export const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * Extract the MIME type from a Content-Type header.
 *
 * Accepts either a full header line (`Content-Type: text/plain; charset=utf-8`)
 * or a bare value, matches the header name case-insensitively, and returns the
 * lowercase `type/subtype` without parameters. Use this value with `allowedMimeTypes`.
 *
 * @param contentType - The Content-Type header line or value
 * @returns The MIME type, or `application/octet-stream` when missing or invalid
 */
export const extractMimeType = (contentType: string | undefined): string => {
  if (!contentType) return DEFAULT_MIME_TYPE;

  const value = contentType.replace(/^\s*content-type\s*:/i, '');
  const mimeType = value.split(';', 1)[0].trim().toLowerCase();

  return /^[\w.+-]+\/[\w.+-]+$/.test(mimeType) ? mimeType : DEFAULT_MIME_TYPE;
};
