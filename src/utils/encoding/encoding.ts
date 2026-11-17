/**
 * Detect character encoding from Byte Order Mark (BOM).
 *
 * Checks for UTF-32 (BE/LE) first since UTF-32LE BOM (0xFF 0xFE 0x00 0x00)
 * overlaps with UTF-16LE BOM (0xFF 0xFE). Then checks UTF-16 (BE/LE).
 *
 * @param buffer - The input buffer to inspect for BOM.
 * @returns The detected encoding name (e.g., 'utf-8', 'utf-16le') or undefined if no BOM found.
 * @example
 * const buf = Buffer.from([0xEF, 0xBB, 0xBF, ...]);
 * detectBom(buf); // 'utf-8'
 */
const detectBom = (buffer: Buffer): string | undefined => {
  // Check UTF-32 first because its little-endian BOM starts with the UTF-16LE BOM.
  if (buffer.subarray(0, 4).equals(Buffer.from([0xff, 0xfe, 0x00, 0x00]))) {
    return 'utf-32le';
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0xfe, 0xff]))) {
    return 'utf-32be';
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    return 'utf-8';
  }
  if (buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) return 'utf-16le';
  if (buffer.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) return 'utf-16be';
  return undefined;
};

/**
 * Validate UTF-8 encoding by attempting to decode the buffer.
 *
 * @param buffer - The input buffer to validate.
 * @returns true if buffer is valid UTF-8; false if invalid.
 * @example
 * isValidUtf8(Buffer.from('hello')); // true
 * isValidUtf8(Buffer.from([0xFF, 0xFF])); // false
 */
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

const isValidUtf8 = (buffer: Buffer): boolean => {
  try {
    utf8Decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if buffer matches a 16-bit encoding pattern.
 *
 * Detects byte alignment for 16-bit encodings by verifying even byte count
 * and checking for zero bytes at expected positions.
 *
 * @param buffer - The input buffer to check.
 * @returns true if buffer matches 16-bit pattern; false otherwise.
 */
const is16BitPattern = (buffer: Buffer): boolean =>
  buffer.length >= 2 &&
  buffer.length % 2 === 0 &&
  buffer.every((_, i) => i % 2 === 0 || buffer[i] === 0x00);

/**
 * Check if buffer matches a 32-bit encoding pattern.
 *
 * Detects byte alignment for 32-bit encodings by verifying byte count
 * is divisible by 4 and checking for zero bytes at expected positions.
 *
 * @param buffer - The input buffer to check.
 * @returns true if buffer matches 32-bit pattern; false otherwise.
 */
const is32BitPattern = (buffer: Buffer): boolean =>
  buffer.length >= 4 &&
  buffer.length % 4 === 0 &&
  buffer.every((_, i) => i % 4 !== 0 || buffer[i] === 0x00);

/**
 * Check if buffer contains binary (non-text) data.
 *
 * Detects binary content by looking for control characters (0x00–0x1F)
 * other than tab (0x09), line feed (0x0A), or carriage return (0x0D).
 *
 * @param buffer - The input buffer to check.
 * @returns true if buffer appears to contain binary data; false if likely text.
 */
const isBinary = (buffer: Buffer): boolean =>
  buffer.some((byte) => byte < 0x20 && ![0x09, 0x0a, 0x0d].includes(byte));

/**
 * Detect encoding fallback when no BOM or UTF-8 detected.
 *
 * Tests against 16-bit, 32-bit patterns, binary content, and Latin-1.
 *
 * @param buffer - The input buffer to analyze.
 * @returns An encoding name (e.g., '16-bit', '32-bit', 'binary', 'latin1').
 */
const detectFallback = (buffer: Buffer): string => {
  if (is16BitPattern(buffer)) return '16-bit';
  if (is32BitPattern(buffer)) return '32-bit';
  if (isBinary(buffer)) return 'binary';
  return 'latin1';
};

/**
 * Detect the character encoding of a buffer.
 *
 * Priority order:
 * 1. Byte Order Mark (BOM) detection (UTF-32/UTF-16/UTF-8)
 * 2. UTF-8 validation
 * 3. Fallback heuristics (16/32-bit patterns, binary, Latin-1)
 *
 * @param buffer - The input buffer to analyze.
 * @returns An encoding name: 'utf-8', 'utf-16le', 'utf-16be', 'utf-32le', 'utf-32be',
 *          'latin1', '16-bit', '32-bit', 'binary', or 'unknown'.
 * @example
 * encoding(Buffer.from('hello')); // 'utf-8'
 * encoding(Buffer.from([0xEF, 0xBB, 0xBF, ...])); // 'utf-8'
 * encoding(Buffer.from([])); // 'unknown'
 */
const encoding = (buffer: Buffer): string => {
  if (buffer.length === 0) return 'unknown';

  const bomEncoding = detectBom(buffer);
  if (bomEncoding) return bomEncoding;
  if (isValidUtf8(buffer)) return 'utf-8';

  return detectFallback(buffer);
};

export default encoding;
