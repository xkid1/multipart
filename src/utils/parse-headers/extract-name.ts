/**
 * Extract name from Content-Disposition header
 * @param contentDisposition - The Content-Disposition header value
 * @returns Extracted name or undefined
 */
export const extractName = (
  contentDisposition: string | undefined,
): string | undefined => {
  if (!contentDisposition) return undefined;
  const nameMatch = /name="([^"]+)"/.exec(contentDisposition);
  return nameMatch ? nameMatch[1].trim() : undefined;
};
