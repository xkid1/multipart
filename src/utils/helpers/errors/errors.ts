/**
 * Stable error codes raised by the parser and middleware.
 * Match on these rather than on error messages.
 */
export const MultiPartErrorCode = {
  /** Content-Type header has no (valid) boundary parameter. */
  NO_BOUNDARY: 'NO_BOUNDARY',
  /** Request body exceeds `maxSize`. */
  LIMIT_BODY_SIZE: 'LIMIT_BODY_SIZE',
  /** More text fields than `maxFields`. */
  LIMIT_FIELDS: 'LIMIT_FIELDS',
  /** More files than `maxFiles`. */
  LIMIT_FILES: 'LIMIT_FILES',
  /** A text field exceeds `fieldSize`. */
  LIMIT_FIELD_SIZE: 'LIMIT_FIELD_SIZE',
  /** A file exceeds `fileSize`. */
  LIMIT_FILE_SIZE: 'LIMIT_FILE_SIZE',
  /** A file's MIME type is not in `allowedMimeTypes`. */
  MIME_TYPE_NOT_ALLOWED: 'MIME_TYPE_NOT_ALLOWED',
  /** The request stream failed or was aborted by the client. */
  REQUEST_ERROR: 'REQUEST_ERROR',
  /** The request body was already consumed by another middleware. */
  BODY_ALREADY_CONSUMED: 'BODY_ALREADY_CONSUMED',
} as const;

export type MultiPartErrorCodeValue =
  (typeof MultiPartErrorCode)[keyof typeof MultiPartErrorCode];

/**
 * Custom error class for multipart parsing, middleware, and storage errors.
 *
 * @example
 * try {
 *   parseMultipartWithDuplicates(body, boundary, { maxFiles: 1 });
 * } catch (error) {
 *   if (error instanceof MultiPartError && error.code === MultiPartErrorCode.LIMIT_FILES) {
 *     // respond with error.statusCode (413)
 *   }
 * }
 */
export class MultiPartError extends Error {
  /** Machine-readable error code (see {@link MultiPartErrorCode}). */
  code?: string;

  /** Suggested HTTP status code for responding to the client. */
  statusCode?: number;

  /** For limit errors: the size or count that was reached. */
  size?: number;

  /** For limit errors: the configured limit. */
  limit?: number;

  /**
   * @param message - Human-readable error description.
   * @param code - Optional error code for categorization.
   * @param options - `cause`, plus HTTP status and limit details.
   */
  constructor(message: string, code?: string, options?: MultiPartErrorOptions) {
    super(message, options);
    this.name = 'MultiPartError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.size = options?.size;
    this.limit = options?.limit;
  }
}

/**
 * Options for {@link MultiPartError}. `cause` is declared here rather than by
 * extending the global `ErrorOptions`, so the published types also compile for
 * consumers whose `lib` predates ES2022.
 */
export interface MultiPartErrorOptions {
  /** The underlying error, exposed as `error.cause`. */
  cause?: unknown;
  statusCode?: number;
  size?: number;
  limit?: number;
}
