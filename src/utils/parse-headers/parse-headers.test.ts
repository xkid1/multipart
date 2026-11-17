import { describe, expect, it } from 'vitest';

import {
  extractExtension,
  extractFilename,
  extractMimeType,
  extractName,
  getHeaderParam,
  parseHeaders,
} from './index.js';

describe('header utilities', () => {
  describe('parseHeaders', () => {
    it('finds headers case-insensitively and returns full lines', () => {
      expect(
        parseHeaders(
          'content-disposition: form-data; name="a"\r\nCONTENT-TYPE: text/plain',
        ),
      ).toEqual({
        contentDisposition: 'content-disposition: form-data; name="a"',
        contentType: 'CONTENT-TYPE: text/plain',
      });
    });

    it('returns undefined for missing headers', () => {
      expect(parseHeaders('X-Other: 1')).toEqual({
        contentDisposition: undefined,
        contentType: undefined,
      });
    });
  });

  describe('getHeaderParam', () => {
    it.each([
      ['form-data; name="a b"', 'name', 'a b'],
      ['form-data; name=token', 'name', 'token'],
      ['form-data; NAME="upper"', 'name', 'upper'],
      ['form-data; filename="f.txt"; name="n"', 'name', 'n'],
      [String.raw`form-data; name="q\"x"`, 'name', 'q"x'],
      ['form-data; filename="f.txt"', 'name', undefined],
    ])('%s -> %s = %s', (header, param, expected) => {
      expect(getHeaderParam(header, param)).toBe(expected);
    });
  });

  describe('extractName', () => {
    it('returns undefined for missing header or empty name', () => {
      expect(extractName(undefined)).toBeUndefined();
      expect(extractName('form-data; name=""')).toBeUndefined();
    });
  });

  describe('extractFilename', () => {
    it('distinguishes an empty filename from no filename', () => {
      expect(extractFilename('form-data; name="f"; filename=""')).toBe('');
      expect(extractFilename('form-data; name="f"')).toBeUndefined();
      expect(extractFilename(undefined)).toBeUndefined();
    });

    it('prefers filename* and falls back to filename when it is malformed', () => {
      expect(
        extractFilename(`form-data; filename="a.txt"; filename*=UTF-8''%E2%82%AC.txt`),
      ).toBe('€.txt');
      expect(
        extractFilename(`form-data; filename="a.txt"; filename*=UTF-8''%E2%ZZ`),
      ).toBe('a.txt');
      expect(extractFilename(`form-data; filename="a.txt"; filename*=nope`)).toBe(
        'a.txt',
      );
    });
  });

  describe('extractMimeType', () => {
    it.each([
      ['Content-Type: text/plain', 'text/plain'],
      ['content-type: Image/PNG; charset=binary', 'image/png'],
      ['application/vnd.api+json', 'application/vnd.api+json'],
      ['Content-Type: ', 'application/octet-stream'],
      ['Content-Type: not a mime', 'application/octet-stream'],
      [undefined, 'application/octet-stream'],
    ])('%s -> %s', (input, expected) => {
      expect(extractMimeType(input)).toBe(expected);
    });
  });

  describe('extractExtension', () => {
    it.each([
      ['photo.jpg', '.jpg'],
      ['archive.tar.gz', '.gz'],
      ['README', ''],
      ['.env', ''],
      ['trailing.', ''],
      ['C:\\fakepath\\report.pdf', '.pdf'],
      ['dir.v2/file', ''],
    ])('%s -> %s', (input, expected) => {
      expect(extractExtension(input)).toBe(expected);
    });
  });
});
