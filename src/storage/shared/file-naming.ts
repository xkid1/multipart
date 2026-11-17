import { randomUUID } from 'node:crypto';

/** Remove control characters (C0, DEL and C1: `\p{Cc}`). */
const stripControlChars = (value: string): string => value.replace(/\p{Cc}/gu, '');

/**
 * Make an uploaded filename safe to use as a path or object-key segment.
 *
 * Removes any directory part (`/` and `\`, since filenames come from the client)
 * and control characters, and replaces names that are empty or `.`/`..` with `file`.
 */
export const sanitizeFilename = (filename: string): string => {
  const basename = filename.split(/[/\\]/).pop() ?? '';
  const cleaned = stripControlChars(basename).trim();
  return cleaned === '' || cleaned === '.' || cleaned === '..' ? 'file' : cleaned;
};

/**
 * Generate a collision-resistant name: `<prefix><timestamp>-<random>-<filename>`.
 * Two uploads of the same file in the same millisecond still get different keys.
 */
export const createUniqueName = (filename: string, prefix = ''): string =>
  `${prefix}${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFilename(filename)}`;

/** RFC 5987 percent-encoding for `filename*=` values. */
const encodeRfc5987 = (value: string): string =>
  encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/**
 * Build a Content-Disposition value that keeps the original filename when the
 * object is downloaded. It includes an ASCII fallback plus the UTF-8
 * `filename*` form.
 *
 * @param filename - Original filename
 * @param type - `inline` (display in the browser) or `attachment` (download)
 */
export const buildContentDisposition = (
  filename: string,
  type: 'inline' | 'attachment' = 'inline',
): string => {
  const safe = sanitizeFilename(filename);
  const ascii = safe.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(safe)}`;
};

/**
 * Resolve the Content-Disposition for an upload. Config `false` omits it,
 * a string is used as-is, and `undefined` uses {@link buildContentDisposition}.
 */
export const resolveContentDisposition = (
  filename: string,
  configured: string | false | undefined,
): string | undefined => {
  if (configured === false) return undefined;
  return configured ?? buildContentDisposition(filename);
};

/** Percent-encode each `/`-separated segment of an object key for use in a URL. */
export const encodeKeyForUrl = (key: string): string =>
  key.split('/').map(encodeURIComponent).join('/');
