/**
 * Check if a part is a boundary end marker or empty
 * @param part - The part buffer
 * @param boundaryEndBuffer - The boundary end marker buffer
 * @returns True if part should be skipped
 */
export const shouldSkipPart = (part: Buffer, boundaryEndBuffer: Buffer): boolean =>
  part.includes(boundaryEndBuffer) || part.length === 0;
