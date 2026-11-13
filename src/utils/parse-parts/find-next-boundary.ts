/**
 * Find boundaries in multipart body
 * @param body - The multipart body buffer
 * @param boundaryBuffer - The boundary delimiter buffer
 * @param startIndex - Start searching from this index
 * @returns Index of next boundary or -1 if not found
 */
export const findNextBoundary = (
  body: Buffer,
  boundaryBuffer: Buffer,
  startIndex: number,
): number => body.indexOf(boundaryBuffer, startIndex);
