/**
 * Split part into header and body sections
 * @param part - The part buffer
 * @returns Object with headerSection string and bodySection buffer, or null if invalid
 */
export const splitPartSections = (
  part: Buffer,
): { headerSection: string; bodySection: Buffer } | null => {
  const headerEndIndex = part.indexOf('\r\n\r\n');
  if (headerEndIndex === -1) return null;

  const headerSection = part.subarray(0, headerEndIndex).toString();
  const bodySection = part.subarray(headerEndIndex + 4);

  return { headerSection, bodySection };
};
