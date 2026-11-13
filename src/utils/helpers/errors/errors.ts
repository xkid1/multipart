/**
 * Custom error class for multipart form-data parsing errors.
 *
 * Extends the native Error class with an optional error code for categorizing
 * different types of parsing failures (e.g., 'INVALID_BOUNDARY', 'MISSING_HEADER').
 *
 * @example
 * throw new MultiPartError('Boundary too long', 'BOUNDARY_TOO_LONG');
 *
 * @example
 * try {
 *   // parsing logic
 * } catch (error) {
 *   if (error instanceof MultiPartError && error.code === 'INVALID_UTF8') {
 *     console.error('Non-UTF-8 content detected');
 *   }
 * }
 */
export class MultiPartError extends Error {
  /**
   * Optional error code for categorizing the error.
   *
   * Common codes:
   * - `INVALID_BOUNDARY` — Boundary format is invalid or missing.
   * - `BOUNDARY_TOO_LONG` — Boundary exceeds 1024-byte limit.
   * - `MISSING_HEADER` — Part lacks required Content-Disposition header.
   * - `INVALID_UTF8` — Field value is not valid UTF-8.
   * - `MALFORMED_PART` — Part structure is corrupted.
   */
  code?: string;

  /**
   * Create a new MultiPartError.
   *
   * @param message - Human-readable error description.
   * @param code - Optional error code for categorization.
   * @param options - Optional ErrorOptions (cause, etc.) passed to Error constructor.
   */
  constructor(message: string, code?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MultiPartError';
    this.code = code;
  }
}
