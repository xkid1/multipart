/**
 * Split a part into its header block and body.
 *
 * Headers end at the first blank line (`CRLF CRLF`). For leniency, a part that
 * is only a header block ending in a single CRLF (an empty value from a client
 * that omits the blank line) is treated as headers with an empty body.
 *
 * @param part - The part bytes (without the surrounding delimiters)
 * @returns The header block as a string and the body bytes, or `null` if there are no headers
 */
export const splitPartSections = (
  part: Buffer,
): { headerSection: string; bodySection: Buffer } | null => {
  const headerEndIndex = part.indexOf('\r\n\r\n');

  if (headerEndIndex === -1) {
    const endsWithCrlf =
      part.length > 2 && part[part.length - 2] === 0x0d && part[part.length - 1] === 0x0a;
    return endsWithCrlf
      ? {
          headerSection: part.subarray(0, part.length - 2).toString(),
          bodySection: part.subarray(part.length),
        }
      : null;
  }

  return {
    headerSection: part.subarray(0, headerEndIndex).toString(),
    bodySection: part.subarray(headerEndIndex + 4),
  };
};
