import Logger from '../helpers/logger/logger.js';

const log = new Logger('encoding');

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
const isValidUtf8 = (buffer: Buffer): boolean => {
  try {
    buffer.toString('utf8');
    return true;
  } catch (err) {
    log.error('Invalid UTF-8 encoding', err);
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
  buffer.length % 2 === 0 && buffer.every((_, i) => i % 2 === 0 || buffer[i] === 0x00);

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
  buffer.length % 4 === 0 && buffer.every((_, i) => i % 4 !== 0 || buffer[i] === 0x00);

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
 * Check if buffer matches a custom 16-bit encoding pattern.
 *
 * Verifies even byte count and checks for character bytes (0x00–0xFF)
 * at odd positions (typical for little-endian 16-bit).
 *
 * @param buffer - The input buffer to check.
 * @returns true if buffer matches custom 16-bit pattern; false otherwise.
 */
const isCustom16Bit = (buffer: Buffer): boolean =>
  buffer.length % 2 === 0 &&
  buffer.every((_, i) => i % 2 === 1 && buffer[i] >= 0x00 && buffer[i] <= 0xff);

/**
 * Check if buffer matches a custom 32-bit encoding pattern.
 *
 * Verifies byte count is divisible by 4 and checks for character bytes (0x00–0xFF)
 * at every 4th position (typical for little-endian 32-bit).
 *
 * @param buffer - The input buffer to check.
 * @returns true if buffer matches custom 32-bit pattern; false otherwise.
 */
const isCustom32Bit = (buffer: Buffer): boolean =>
  buffer.length % 4 === 0 &&
  buffer.every((_, i) => i % 4 === 3 && buffer[i] >= 0x00 && buffer[i] <= 0xff);

/**
 * Detect encoding fallback when no BOM or UTF-8 detected.
 *
 * Tests against ASCII, Latin-1, 16-bit, 32-bit patterns, binary content,
 * and custom multi-byte encodings.
 *
 * @param buffer - The input buffer to analyze.
 * @returns An encoding name (e.g., 'ascii', 'latin1', 'binary', '16-bit') or 'unknown'.
 */
const detectFallback = (buffer: Buffer): string => {
  if (buffer.every((byte) => byte >= 0x00 && byte <= 0x7f)) return 'ascii';
  if (buffer.every((byte) => byte >= 0x00 && byte <= 0xff)) return 'latin1';
  if (is16BitPattern(buffer)) return '16-bit';
  if (is32BitPattern(buffer)) return '32-bit';
  if (isBinary(buffer)) return 'binary';
  if (buffer.every((byte) => byte >= 0x00 && byte <= 0xff)) return '8-bit';
  if (isCustom16Bit(buffer)) return '16-bit custom';
  if (isCustom32Bit(buffer)) return '32-bit custom';
  return 'unknown';
};

/**
 * Detect the character encoding of a buffer.
 *
 * Priority order:
 * 1. Byte Order Mark (BOM) detection (UTF-32/UTF-16/UTF-8)
 * 2. UTF-8 validation
 * 3. Fallback heuristics (ASCII, Latin-1, multi-byte patterns, binary)
 *
 * @param buffer - The input buffer to analyze.
 * @returns An encoding name: 'utf-8', 'utf-16le', 'utf-16be', 'utf-32le', 'utf-32be',
 *          'ascii', 'latin1', '16-bit', '32-bit', 'binary', '8-bit', '16-bit custom',
 *          '32-bit custom', or 'unknown'.
 * @example
 * encoding(Buffer.from('hello')); // 'ascii' or 'utf-8'
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
