/**
 * Extract filename from Content-Disposition header
 * @param contentDisposition - The Content-Disposition header value
 * @returns Extracted filename or undefined
 */
export const extractFilename = (
  contentDisposition: string | undefined,
): string | undefined => {
  if (!contentDisposition) return undefined;
  const filenameMatch = /filename="([^"]+)"/.exec(contentDisposition);
  return filenameMatch ? filenameMatch[1].trim() : undefined;
};
