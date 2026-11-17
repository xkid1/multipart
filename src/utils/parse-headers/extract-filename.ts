import { getHeaderParam } from './header-params.js';

/**
 * Decode an RFC 5987 extended value such as `UTF-8''na%C3%AFve.txt`.
 * Returns `undefined` if the value is malformed.
 */
const decodeExtendedValue = (value: string): string | undefined => {
  const match = /^[\w!#$&+.^`|~-]*'[\w-]*'(.*)$/.exec(value);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};

/**
 * Extract the filename from a Content-Disposition header.
 *
 * Prefers the RFC 5987 `filename*` parameter (UTF-8 names) over `filename`.
 *
 * An empty string is returned for `filename=""`, which browsers send for a
 * file input with no file selected. That keeps it distinct from a text field,
 * which has no filename parameter at all.
 *
 * @param contentDisposition - The Content-Disposition header line or value
 * @returns The filename, `''` for an empty file input, or `undefined` for non-file parts
 */
export const extractFilename = (
  contentDisposition: string | undefined,
): string | undefined => {
  if (!contentDisposition) return undefined;

  const extended = getHeaderParam(contentDisposition, 'filename\\*');
  const decoded = extended === undefined ? undefined : decodeExtendedValue(extended);
  if (decoded !== undefined) return decoded.trim();

  return getHeaderParam(contentDisposition, 'filename')?.trim();
};
