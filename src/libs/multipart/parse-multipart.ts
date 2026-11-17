import { Logger, MultiPartError, MultiPartErrorCode } from '../../utils/index.js';

import {
  createFormRecord,
  isFilePart,
  readFormParts,
  toFieldValue,
  toFileData,
} from './form-parts.js';

import type { FileData, MiddlewareOptions, ParsedFormData } from '../../types/index.js';

const MB = 1024 * 1024;

/** Default limits applied by {@link parseMultipartWithDuplicates} and the middleware. */
export const DEFAULT_LIMITS = {
  maxSize: 100 * MB,
  maxFields: 1000,
  maxFiles: 100,
  fieldSize: 10 * MB,
  fileSize: 50 * MB,
} as const;

export type ResolvedLimits = { -readonly [K in keyof typeof DEFAULT_LIMITS]: number };

const log = new Logger('multipart');

/** Merge user options over {@link DEFAULT_LIMITS}. An explicit `0` is kept. */
export const resolveLimits = (options: MiddlewareOptions = {}): ResolvedLimits => ({
  maxSize: options.maxSize ?? DEFAULT_LIMITS.maxSize,
  maxFields: options.maxFields ?? DEFAULT_LIMITS.maxFields,
  maxFiles: options.maxFiles ?? DEFAULT_LIMITS.maxFiles,
  fieldSize: options.fieldSize ?? DEFAULT_LIMITS.fieldSize,
  fileSize: options.fileSize ?? DEFAULT_LIMITS.fileSize,
});

/** Build a 413 error for an exceeded limit. */
export const limitError = (
  code: string,
  message: string,
  size?: number,
  limit?: number,
): MultiPartError => new MultiPartError(message, code, { statusCode: 413, size, limit });

/**
 * Whether a MIME type is allowed. An empty or missing list allows everything.
 * Entries are case-insensitive and may use a wildcard subtype (`image/*`).
 */
export const isMimeTypeAllowed = (mimeType: string, allowed?: string[]): boolean => {
  if (!allowed || allowed.length === 0) return true;
  const type = mimeType.toLowerCase();
  return allowed.some((entry) => {
    const rule = entry.toLowerCase();
    return rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : type === rule;
  });
};

type FormValue = ParsedFormData[string];

/** Combine a new value with any existing one for the same name; repeats become arrays. */
const mergeValue = (
  existing: FormValue | undefined,
  value: string | FileData,
): FormValue => {
  if (existing === undefined) return value;
  if (!Array.isArray(existing)) return [existing, value];
  existing.push(value);
  return existing;
};

/**
 * Parse a multipart/form-data body, keeping every value of repeated field names
 * and enforcing size, count, and MIME-type limits.
 *
 * Limits are checked before a part's value is decoded, so an oversized field or
 * file is rejected without extra work.
 *
 * @param body - The raw multipart body buffer
 * @param boundary - The boundary from the Content-Type header (without dashes)
 * @param options - Limits and parser options (see {@link MiddlewareOptions})
 * @returns Field names mapped to a value, or an array of values when the name repeats
 * @throws {MultiPartError} When a limit is exceeded (`statusCode` 413) or a MIME type
 *   is not allowed (`statusCode` 415). See {@link MultiPartErrorCode}.
 */
export const parseMultipartWithDuplicates = (
  body: Buffer,
  boundary: string,
  options: MiddlewareOptions = {},
): ParsedFormData => {
  const limits = resolveLimits(options);
  const { allowedMimeTypes, debug = false } = options;

  if (body.byteLength > limits.maxSize) {
    throw limitError(
      MultiPartErrorCode.LIMIT_BODY_SIZE,
      `Body size ${body.byteLength} exceeds maximum ${limits.maxSize}`,
      body.byteLength,
      limits.maxSize,
    );
  }

  const data = createFormRecord<FormValue>();
  let fieldCount = 0;
  let fileCount = 0;

  for (const part of readFormParts(body, boundary)) {
    const size = part.data.byteLength;

    if (!isFilePart(part)) {
      if (++fieldCount > limits.maxFields) {
        throw limitError(
          MultiPartErrorCode.LIMIT_FIELDS,
          `Maximum fields (${limits.maxFields}) exceeded`,
          fieldCount,
          limits.maxFields,
        );
      }
      if (size > limits.fieldSize) {
        throw limitError(
          MultiPartErrorCode.LIMIT_FIELD_SIZE,
          `Field size ${size} exceeds limit ${limits.fieldSize}`,
          size,
          limits.fieldSize,
        );
      }
      data[part.name] = mergeValue(data[part.name], toFieldValue(part));
      // Field values are never logged: they may hold passwords or tokens.
      if (debug) log.info(`Field: ${part.name} (${size}B)`);
      continue;
    }

    if (++fileCount > limits.maxFiles) {
      throw limitError(
        MultiPartErrorCode.LIMIT_FILES,
        `Maximum files (${limits.maxFiles}) exceeded`,
        fileCount,
        limits.maxFiles,
      );
    }
    if (size > limits.fileSize) {
      throw limitError(
        MultiPartErrorCode.LIMIT_FILE_SIZE,
        `File size ${size} exceeds limit ${limits.fileSize}`,
        size,
        limits.fileSize,
      );
    }

    const file = toFileData(part);
    if (!isMimeTypeAllowed(file.mimeType, allowedMimeTypes)) {
      throw new MultiPartError(
        `MIME type ${file.mimeType} not allowed for field ${part.name}`,
        MultiPartErrorCode.MIME_TYPE_NOT_ALLOWED,
        { statusCode: 415 },
      );
    }

    data[part.name] = mergeValue(data[part.name], file);
    if (debug) log.info(`File: ${part.name} = ${file.name} (${file.mimeType}, ${size}B)`);
  }

  if (debug) log.info(`Parsing complete: ${fieldCount} fields, ${fileCount} files`);

  return data;
};
