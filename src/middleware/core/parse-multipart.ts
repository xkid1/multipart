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

import type { MiddlewareOptions, ParsedFormData } from './types';
import type { FileData } from '@types';

/**
 * Enhanced multipart parser that supports multiple files/fields per key
 * Returns an array/single value structure for duplicate field names
 *
 * @param body - The raw multipart body buffer
 * @param boundary - The boundary delimiter string (without dashes)
 * @param options - Parser options
 * @returns Parsed form data with support for multiple same-name fields
 */
export const parseMultipartWithDuplicates = (
  body: Buffer,
  boundary: string,
  options: MiddlewareOptions = {},
): ParsedFormData => {
  const {
    maxSize = 104857600, // 100MB
    maxFields = 1000,
    maxFiles = 100,
    allowedMimeTypes,
    fieldSize = 10485760, // 10MB
    fileSize = 52428800, // 50MB
    debug = false,
  } = options;

  // Validate body size
  if (body.byteLength > maxSize) {
    throw new Error(`Body size ${body.byteLength} exceeds maximum ${maxSize}`);
  }

  const data: ParsedFormData = {};
  let fieldCount = 0;
  let fileCount = 0;

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const boundaryEndBuffer = Buffer.from(`--${boundary}--`);

  let boundaryIndex = findNextBoundary(body, boundaryBuffer, 0);

  while (boundaryIndex !== -1) {
    // Check field and file limits
    if (fieldCount >= maxFields) {
      throw new Error(`Maximum fields (${maxFields}) exceeded`);
    }
    if (fileCount >= maxFiles) {
      throw new Error(`Maximum files (${maxFiles}) exceeded`);
    }

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
          // Handle file upload
          if (fileCount >= maxFiles) {
            throw new Error(`Maximum files (${maxFiles}) exceeded`);
          }

          // Check file size
          if (bodySection.byteLength > fileSize) {
            throw new Error(
              `File size ${bodySection.byteLength} exceeds limit ${fileSize}`,
            );
          }

          const mimetype = extractMimeType(contentType);

          // Check MIME type if whitelist provided
          if (
            allowedMimeTypes &&
            allowedMimeTypes.length > 0 &&
            !allowedMimeTypes.includes(mimetype)
          ) {
            throw new Error(`MIME type ${mimetype} not allowed for field ${name}`);
          }

          const extension = extractExtension(filename);
          const fileData: FileData = {
            name: filename,
            mimeType: mimetype,
            size: bodySection.byteLength,
            encoding: encoding(bodySection),
            extension,
            buffer: bodySection,
          };

          if (debug) {
            console.log(
              `[multipart] File: ${name} = ${filename} (${mimetype}, ${bodySection.byteLength}B)`,
            );
          }

          // Handle multiple files with same name
          if (data[name]) {
            if (Array.isArray(data[name])) {
              (data[name] as FileData[]).push(fileData);
            } else {
              data[name] = [data[name], fileData];
            }
          } else {
            data[name] = fileData;
          }

          fileCount++;
        } else {
          // Handle text field
          if (bodySection.byteLength > fieldSize) {
            throw new Error(
              `Field size ${bodySection.byteLength} exceeds limit ${fieldSize}`,
            );
          }

          const textValue = bodySection.toString().trim();

          if (debug) {
            console.log(`[multipart] Field: ${name} = ${textValue}`);
          }

          // Handle multiple fields with same name
          if (data[name]) {
            if (Array.isArray(data[name])) {
              (data[name] as string[]).push(textValue);
            } else {
              data[name] = [data[name], textValue];
            }
          } else {
            data[name] = textValue;
          }

          fieldCount++;
        }
      }
    }

    if (nextBoundaryIndex === -1) break;
    boundaryIndex = nextBoundaryIndex;
  }

  if (debug) {
    console.log(`[multipart] Parsing complete: ${fieldCount} fields, ${fileCount} files`);
  }

  return data;
};
