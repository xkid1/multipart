import { findNextBoundary } from './find-next-boundary';

/**
 * Extract a single part from multipart body between boundaries
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
