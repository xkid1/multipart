import {
  encoding,
  extractExtension,
  extractFilename,
  extractMimeType,
  extractName,
  iterateParts,
  parseHeaders,
} from '@utils';

import type { FileData } from '@types';

/** A named form part, before any limits or conversion are applied. */
export interface FormPart {
  /** Field name from Content-Disposition. */
  name: string;
  /** Filename for file parts; `undefined` for text fields. */
  filename: string | undefined;
  /** Raw Content-Type header line, if present. */
  contentType: string | undefined;
  /** Exact body bytes. */
  data: Buffer;
}

/**
 * Iterate the named parts of a multipart body.
 *
 * Skips parts without a usable `name`, and file inputs that were left empty
 * (`filename=""` with no content), which browsers still send.
 */
export function* readFormParts(body: Buffer, boundary: string): Generator<FormPart> {
  for (const { headerSection, bodySection } of iterateParts(body, boundary)) {
    const { contentDisposition, contentType } = parseHeaders(headerSection);
    const name = extractName(contentDisposition);
    if (!name) continue;

    const filename = extractFilename(contentDisposition);
    if (filename === '' && bodySection.byteLength === 0) continue;

    yield { name, filename, contentType, data: bodySection };
  }
}

/** True for parts sent as file uploads (they carry a `filename` parameter). */
export const isFilePart = (part: FormPart): part is FormPart & { filename: string } =>
  part.filename !== undefined;

/** Build the public {@link FileData} shape for a file part. */
export const toFileData = (part: FormPart & { filename: string }): FileData => ({
  name: part.filename,
  mimeType: extractMimeType(part.contentType),
  size: part.data.byteLength,
  encoding: encoding(part.data),
  extension: extractExtension(part.filename),
  buffer: part.data,
});

/** Decode a text field. Form fields are UTF-8 in every modern browser. */
export const toFieldValue = (part: FormPart): string => part.data.toString('utf8');

/**
 * Create an empty result object with no prototype, so field names such as
 * `__proto__` or `constructor` are stored as plain data and can't pollute
 * or shadow anything.
 */
export const createFormRecord = <T>(): Record<string, T> =>
  Object.create(null) as Record<string, T>;
