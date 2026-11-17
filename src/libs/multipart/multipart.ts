import {
  createFormRecord,
  isFilePart,
  readFormParts,
  toFieldValue,
  toFileData,
} from './form-parts';

import type { FileData } from '@types';

/**
 * Parse a multipart/form-data body into a flat object.
 *
 * When a field name repeats, the last value wins. Use
 * {@link parseMultipartWithDuplicates} to keep every value and to enforce size
 * and count limits; prefer it for untrusted input.
 *
 * @param body - The raw multipart body buffer
 * @param boundary - The boundary from the Content-Type header (without dashes)
 * @returns Field names mapped to a string (text field) or {@link FileData} (file)
 */
const multipart = (body: Buffer, boundary: string): Record<string, FileData | string> => {
  const data = createFormRecord<FileData | string>();

  for (const part of readFormParts(body, boundary)) {
    data[part.name] = isFilePart(part) ? toFileData(part) : toFieldValue(part);
  }

  return data;
};

export default multipart;
