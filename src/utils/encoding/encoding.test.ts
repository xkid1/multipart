import { describe, expect, it } from 'vitest';

import encoding from './encoding.js';

describe('encoding utility', () => {
  it('should return unknown for empty buffer', () => {
    expect(encoding(Buffer.from([]))).toBe('unknown');
  });

  it('should detect UTF-8 with BOM', () => {
    const buf = Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x62, 0x63]);
    expect(encoding(buf)).toBe('utf-8');
  });

  it('should detect UTF-16LE and UTF-16BE BOMs', () => {
    const le = Buffer.from([0xff, 0xfe, 0x61, 0x00]);
    const be = Buffer.from([0xfe, 0xff, 0x00, 0x61]);
    expect(encoding(le)).toBe('utf-16le');
    expect(encoding(be)).toBe('utf-16be');
  });

  it('should detect UTF-32LE and UTF-32BE BOMs', () => {
    const le = Buffer.from([0xff, 0xfe, 0x00, 0x00, 0x61, 0x00, 0x00, 0x00]);
    const be = Buffer.from([0x00, 0x00, 0xfe, 0xff, 0x00, 0x00, 0x00, 0x61]);
    expect(encoding(le)).toBe('utf-32le');
    expect(encoding(be)).toBe('utf-32be');
  });

  it('should detect plain UTF-8 text', () => {
    const buf = Buffer.from('Hello world! 🚀');
    expect(encoding(buf)).toBe('utf-8');
  });

  it('should detect 16-bit pattern fallback', () => {
    // Invalid UTF-8 (has 0xFF) with even length and odd positions 0x00
    const buf = Buffer.from([0xff, 0x00, 0xfe, 0x00]);
    expect(encoding(buf)).toBe('16-bit');
  });

  it('should detect binary fallback', () => {
    // Non-UTF8 with control chars
    const buf = Buffer.from([0xff, 0x05, 0x01, 0x02]);
    expect(encoding(buf)).toBe('binary');
  });

  it('should fallback to latin1 for non-UTF8 high bytes without controls', () => {
    const buf = Buffer.from([0x80, 0x81, 0x82, 0x83, 0xa0]);
    expect(encoding(buf)).toBe('latin1');
  });
});
