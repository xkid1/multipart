import { getHeaderParam } from '../../utils/index.js';

/** Normalize a header that Node may expose as a string or string[]. */
export const firstHeaderValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

/** Whether a Content-Type header denotes `multipart/form-data` (case-insensitive). */
export const isMultipartFormData = (contentType: string | undefined): boolean =>
  !!contentType && /^\s*multipart\/form-data\s*(?:;|$)/i.test(contentType);

/**
 * Extract the boundary parameter from a Content-Type header.
 *
 * @example
 * extractBoundary('multipart/form-data; boundary="abc 123"'); // 'abc 123'
 * @returns The boundary (quotes removed), or `undefined` if missing or empty
 */
export const extractBoundary = (contentType: string | undefined): string | undefined => {
  if (!contentType) return undefined;
  const boundary = getHeaderParam(contentType, 'boundary');
  return boundary === '' ? undefined : boundary;
};
