/**
 * Extract MIME type from Content-Type header
 * @param contentType - The Content-Type header value
 * @returns MIME type or default application/octet-stream
 */
export const extractMimeType = (contentType: string | undefined): string => {
  if (!contentType) return 'application/octet-stream';
  const mimetypeMatch = /Content-Type: ([^]*)/.exec(contentType);
  return mimetypeMatch ? mimetypeMatch[1].trim() : 'application/octet-stream';
};
