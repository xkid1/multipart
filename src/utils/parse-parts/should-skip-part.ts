/**
 * Check if a part is a boundary end marker or empty
 *
 * @deprecated Only meaningful together with {@link extractPart}. Use
 * {@link iterateParts} instead. Will be removed in the next major version.
 * @param part - The part buffer
 * @param boundaryEndBuffer - The boundary end marker buffer
 * @returns True if part should be skipped
 */
export const shouldSkipPart = (part: Buffer, boundaryEndBuffer: Buffer): boolean =>
  part.includes(boundaryEndBuffer) || part.length === 0;
