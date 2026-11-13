import { describe, expect, it } from 'vitest';

import { parseMultipartWithDuplicates } from './parse-multipart';

import type { MiddlewareOptions } from '@types';

describe('parseMultipartWithDuplicates', () => {
  describe('Single field parsing', () => {
    it('parses valid single text field', () => {
      const boundary = 'boundary123';
      const body = Buffer.from(
        `--boundary123\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n--boundary123--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.username).toBe('alice');
    });

    it('parses single field with special characters', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="bio"\r\n\r\nHello & Welcome!\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.bio).toBe('Hello & Welcome!');
    });

    it('parses single field with empty value', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="optional"\r\n\r\n\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.optional).toBe('');
    });

    it('parses single field with numeric string', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="age"\r\n\r\n25\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.age).toBe('25');
    });
  });

  describe('Multiple fields', () => {
    it('parses multiple text fields', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n` +
          `--b\r\nContent-Disposition: form-data; name="email"\r\n\r\nalice@example.com\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.username).toBe('alice');
      expect(result.email).toBe('alice@example.com');
    });

    it('parses three or more fields correctly', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="field1"\r\n\r\nvalue1\r\n` +
          `--b\r\nContent-Disposition: form-data; name="field2"\r\n\r\nvalue2\r\n` +
          `--b\r\nContent-Disposition: form-data; name="field3"\r\n\r\nvalue3\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.field1).toBe('value1');
      expect(result.field2).toBe('value2');
      expect(result.field3).toBe('value3');
    });
  });

  describe('Duplicate field names (multiple same-name fields)', () => {
    it('converts duplicate fields to array', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="tags"\r\n\r\njavaScript\r\n` +
          `--b\r\nContent-Disposition: form-data; name="tags"\r\n\r\ntypeScript\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags).toEqual(['javaScript', 'typeScript']);
    });

    it('handles three duplicate fields', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="option"\r\n\r\nA\r\n` +
          `--b\r\nContent-Disposition: form-data; name="option"\r\n\r\nB\r\n` +
          `--b\r\nContent-Disposition: form-data; name="option"\r\n\r\nC\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.option).toEqual(['A', 'B', 'C']);
    });

    it('keeps single-occurrence fields as strings', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(typeof result.username).toBe('string');
      expect(result.username).toBe('alice');
    });
  });

  describe('File upload', () => {
    it('parses single file upload', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="avatar"; filename="pic.jpg"\r\n` +
          `Content-Type: image/jpeg\r\n\r\n` +
          `JPEG_BINARY_DATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.avatar).toBeDefined();
      expect(result.avatar).toHaveProperty('name', 'pic.jpg');
      expect(result.avatar).toHaveProperty('extension', '.jpg');
      expect(result.avatar).toHaveProperty('mimeType', 'image/jpeg');
      expect(result.avatar).toHaveProperty('buffer');
    });

    it('handles file with double extension', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="file"; filename="archive.tar.gz"\r\n` +
          `Content-Type: application/gzip\r\n\r\nDATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.file).toHaveProperty('name', 'archive.tar.gz');
      expect(result.file).toHaveProperty('extension', '.gz');
    });
  });

  describe('Multiple files', () => {
    it('converts multiple same-name files to array', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="files"; filename="file1.txt"\r\n` +
          `Content-Type: text/plain\r\n\r\nCONTENT1\r\n` +
          `--b\r\nContent-Disposition: form-data; name="files"; filename="file2.txt"\r\n` +
          `Content-Type: text/plain\r\n\r\nCONTENT2\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]).toHaveProperty('name', 'file1.txt');
      expect(result.files[1]).toHaveProperty('name', 'file2.txt');
    });

    it('handles three files with same name', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="images"; filename="img1.png"\r\n` +
          `Content-Type: image/png\r\n\r\nDATA1\r\n` +
          `--b\r\nContent-Disposition: form-data; name="images"; filename="img2.png"\r\n` +
          `Content-Type: image/png\r\n\r\nDATA2\r\n` +
          `--b\r\nContent-Disposition: form-data; name="images"; filename="img3.png"\r\n` +
          `Content-Type: image/png\r\n\r\nDATA3\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.images).toHaveLength(3);
      expect(result.images[0]).toHaveProperty('name', 'img1.png');
      expect(result.images[1]).toHaveProperty('name', 'img2.png');
      expect(result.images[2]).toHaveProperty('name', 'img3.png');
    });
  });

  describe('Mixed fields and files', () => {
    it('parses form with mixed text fields and file upload', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n` +
          `--b\r\nContent-Disposition: form-data; name="avatar"; filename="pic.jpg"\r\n` +
          `Content-Type: image/jpeg\r\n\r\nDATA\r\n` +
          `--b\r\nContent-Disposition: form-data; name="bio"\r\n\r\nSoftware Engineer\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.username).toBe('alice');
      expect(result.bio).toBe('Software Engineer');
      expect(result.avatar).toHaveProperty('name', 'pic.jpg');
    });

    it('parses form with multiple duplicate fields and multiple files', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="tag"\r\n\r\nfoo\r\n` +
          `--b\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\n` +
          `Content-Type: text/plain\r\n\r\nDATA_A\r\n` +
          `--b\r\nContent-Disposition: form-data; name="tag"\r\n\r\nbar\r\n` +
          `--b\r\nContent-Disposition: form-data; name="file"; filename="b.txt"\r\n` +
          `Content-Type: text/plain\r\n\r\nDATA_B\r\n` +
          `--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.tag).toEqual(['foo', 'bar']);
      expect(result.file).toHaveLength(2);
      expect(result.file[0]).toHaveProperty('name', 'a.txt');
      expect(result.file[1]).toHaveProperty('name', 'b.txt');
    });
  });

  describe('MIME type handling', () => {
    it('parses Content-Type header correctly', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="doc"; filename="file.pdf"\r\n` +
          `Content-Type: application/pdf\r\n\r\nPDF_DATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.doc).toHaveProperty('mimeType', 'application/pdf');
    });
  });

  describe('MIME type filtering (allowedMimeTypes option)', () => {
    it('accepts files matching allowed MIME types', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="image"; filename="pic.jpg"\r\n` +
          `Content-Type: image/jpeg\r\n\r\nDATA\r\n--b--\r\n`,
      );

      const options: MiddlewareOptions = {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      };

      const result = parseMultipartWithDuplicates(body, boundary, options);

      expect(result.image).toBeDefined();
    });

    it('accepts all MIME types when filter not specified', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="file"; filename="any.bin"\r\n` +
          `Content-Type: application/octet-stream\r\n\r\nDATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.file).toBeDefined();
    });
  });

  describe('Size limit handling', () => {
    it('throws error if body exceeds maxSize limit', () => {
      const boundary = 'b';
      const largeData = Buffer.alloc(1100);
      const body = Buffer.concat([
        Buffer.from(
          `--b\r\nContent-Disposition: form-data; name="file"; filename="large.bin"\r\n\r\n`,
        ),
        largeData,
        Buffer.from('\r\n--b--\r\n'),
      ]);

      const options: MiddlewareOptions = { maxSize: 1000 };

      expect(() => parseMultipartWithDuplicates(body, boundary, options)).toThrow();
    });

    it('allows body within maxSize limit', () => {
      const boundary = 'b';
      const data = Buffer.alloc(900);
      const body = Buffer.concat([
        Buffer.from(
          `--b\r\nContent-Disposition: form-data; name="file"; filename="small.bin"\r\n\r\n`,
        ),
        data,
        Buffer.from('\r\n--b--\r\n'),
      ]);

      const options: MiddlewareOptions = { maxSize: 1000 };

      const result = parseMultipartWithDuplicates(body, boundary, options);
      expect(result.file).toBeDefined();
    });

    it('throws error if individual field exceeds fieldSize limit', () => {
      const boundary = 'b';
      const largeValue = 'x'.repeat(1100);
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="text"\r\n\r\n${largeValue}\r\n--b--\r\n`,
      );

      const options: MiddlewareOptions = { fieldSize: 1000 };

      expect(() => parseMultipartWithDuplicates(body, boundary, options)).toThrow();
    });
  });

  describe('Boundary handling', () => {
    it('handles boundary with special characters', () => {
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const body = Buffer.from(
        `------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n` +
          `Content-Disposition: form-data; name="field"\r\n\r\n` +
          `value\r\n` +
          `------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.field).toBe('value');
    });

    it('handles short single-character boundary', () => {
      const boundary = 'x';
      const body = Buffer.from(
        `--x\r\nContent-Disposition: form-data; name="f"\r\n\r\nv\r\n--x--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.f).toBe('v');
    });
  });

  describe('Preamble and epilogue handling', () => {
    it('ignores preamble before first boundary', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `This is preamble text\r\n` +
          `--b\r\nContent-Disposition: form-data; name="field"\r\n\r\n` +
          `value\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.field).toBe('value');
    });

    it('ignores epilogue after final boundary', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="field"\r\n\r\n` +
          `value\r\n--b--\r\nThis is epilogue text that should be ignored`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.field).toBe('value');
    });
  });

  describe('Field name extraction', () => {
    it('extracts simple field name correctly', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="username"\r\n\r\nalice\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result).toHaveProperty('username');
    });

    it('extracts field name with underscores', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="first_name"\r\n\r\njohn\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result).toHaveProperty('first_name');
    });

    it('extracts field name with numbers', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="field123"\r\n\r\nvalue\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result).toHaveProperty('field123');
    });

    it('extracts field name with brackets (array notation)', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="items[]"\r\n\r\nitem1\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result).toHaveProperty('items[]');
    });
  });

  describe('Filename extraction', () => {
    it('extracts simple filename', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="file"; filename="document.pdf"\r\n` +
          `Content-Type: application/pdf\r\n\r\nDATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.file).toHaveProperty('name', 'document.pdf');
    });

    it('extracts filename with spaces', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="file"; filename="my document.txt"\r\n` +
          `Content-Type: text/plain\r\n\r\nDATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.file).toHaveProperty('name', 'my document.txt');
    });

    it('extracts filename with dashes and underscores', () => {
      const boundary = 'b';
      const body = Buffer.from(
        `--b\r\nContent-Disposition: form-data; name="file"; filename="my-file_v2.docx"\r\n` +
          `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\nDATA\r\n--b--\r\n`,
      );

      const result = parseMultipartWithDuplicates(body, boundary);

      expect(result.file).toHaveProperty('name', 'my-file_v2.docx');
    });
  });

  describe('Error handling', () => {
    it('handles missing Content-Disposition header gracefully', () => {
      const boundary = 'b';
      const body = Buffer.from(`--b\r\n\r\nvalue\r\n--b--\r\n`);

      const result = parseMultipartWithDuplicates(body, boundary);
      expect(Object.keys(result).length).toBe(0);
    });
  });
});
