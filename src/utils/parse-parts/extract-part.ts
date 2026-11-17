import { findNextBoundary } from './find-next-boundary.js';

/**
 * Extract a single part from multipart body between boundaries
 *
 * @deprecated The returned part keeps the CRLF that precedes the next boundary, so
 * part bodies are 2 bytes too long. The parser no longer uses this helper; use
 * {@link iterateParts} instead. Will be removed in the next major version.
 * @param body - The multipart body buffer
 * @param boundaryBuffer - The boundary delimiter buffer
 * @param startBoundaryIndex - Index of current boundary
 * @returns Object with part buffer and next boundary index
 */
export const extractPart = (
  body: Buffer,
  boundaryBuffer: Buffer,
  startBoundaryIndex: number,
): { part: Buffer; nextBoundaryIndex: number } => {
  const nextBoundaryIndex = findNextBoundary(
    body,
    boundaryBuffer,
    startBoundaryIndex + boundaryBuffer.length,
  );

  const part =
    nextBoundaryIndex === -1
      ? body.subarray(startBoundaryIndex + boundaryBuffer.length)
      : body.subarray(startBoundaryIndex + boundaryBuffer.length, nextBoundaryIndex);

  return { part, nextBoundaryIndex };
};
