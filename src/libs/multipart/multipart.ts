import {
  encoding,
  extractExtension,
  extractFilename,
  extractMimeType,
  extractName,
  extractPart,
  findNextBoundary,
  parseHeaders,
  shouldSkipPart,
  splitPartSections,
} from '@utils';

import type { FileData } from '@types';

/**
 * Parse multipart form-data from a buffer
 * @param body - The raw multipart body buffer
 * @param boundary - The boundary delimiter string (without dashes)
 * @returns Parsed form data with field names mapped to FileData or string values
 */
const multipart = (body: Buffer, boundary: string): Record<string, FileData | string> => {
  const data: Record<string, FileData | string> = {};

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const boundaryEndBuffer = Buffer.from(`--${boundary}--`);

  let boundaryIndex = findNextBoundary(body, boundaryBuffer, 0);

  while (boundaryIndex !== -1) {
    const { part, nextBoundaryIndex } = extractPart(body, boundaryBuffer, boundaryIndex);

    if (shouldSkipPart(part, boundaryEndBuffer)) {
      if (nextBoundaryIndex === -1) break;
      boundaryIndex = nextBoundaryIndex;
      continue;
    }

    const sections = splitPartSections(part);
    if (!sections) {
      if (nextBoundaryIndex === -1) break;
      boundaryIndex = nextBoundaryIndex;
      continue;
    }

    const { headerSection, bodySection } = sections;
    const { contentDisposition, contentType } = parseHeaders(headerSection);

    if (contentDisposition) {
      const name = extractName(contentDisposition);
      if (name) {
        const filename = extractFilename(contentDisposition);
        if (filename && contentType) {
          const mimetype = extractMimeType(contentType);
          const extension = extractExtension(filename);
          data[name] = {
            name: filename,
            mimeType: mimetype,
            size: bodySection.byteLength,
            encoding: encoding(bodySection),
            extension,
            buffer: bodySection,
          };
        } else {
          data[name] = bodySection.toString().trim();
        }
      }
    }

    if (nextBoundaryIndex === -1) break;
    boundaryIndex = nextBoundaryIndex;
  }

  return data;
};

export default multipart;
