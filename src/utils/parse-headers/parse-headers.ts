import { findHeaderLine } from './header-params';

/**
 * Parse the header block of a single multipart part.
 *
 * Header names are matched case-insensitively, as HTTP requires.
 *
 * @param headerSection - The raw header block (lines separated by CRLF)
 * @returns The full `Content-Disposition` and `Content-Type` header lines, if present
 */
export const parseHeaders = (
  headerSection: string,
): { contentDisposition: string | undefined; contentType: string | undefined } => {
  const lines = headerSection.split('\r\n');
  return {
    contentDisposition: findHeaderLine(lines, 'Content-Disposition'),
    contentType: findHeaderLine(lines, 'Content-Type'),
  };
};
