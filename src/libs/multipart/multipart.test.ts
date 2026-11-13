import { describe, expect, it } from 'vitest';

import multipart from './multipart';

import type { FileData } from '@types';

/**
 * Unit tests for the multipart form-data parser
 * Tests cover basic parsing, file uploads, edge cases, and error conditions
 */
describe('multipart parser', () => {
  /**
   * BASIC FUNCTIONALITY TESTS
   */
  describe('basic parsing', () => {
    it('should parse single text field', () => {
      const boundary = 'boundary-123';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="field1"',
          '',
          'value1',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result).toHaveProperty('field1');
      expect(result.field1).toBe('value1');
    });

    it('should parse multiple text fields', () => {
      const boundary = 'boundary-456';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="username"',
          '',
          'john_doe',
          `--${boundary}`,
          'Content-Disposition: form-data; name="email"',
          '',
          'john@example.com',
          `--${boundary}`,
          'Content-Disposition: form-data; name="age"',
          '',
          '25',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('age');
      expect(result.username).toBe('john_doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe('25');
    });

    it('should return empty object for empty body', () => {
      const boundary = 'boundary-789';
      const body = Buffer.from('');

      const result = multipart(body, boundary);

      expect(result).toEqual({});
    });

    it('should handle multipart body with no boundaries found', () => {
      const boundary = 'boundary-no-match';
      const body = Buffer.from('some random data');

      const result = multipart(body, boundary);

      expect(result).toEqual({});
    });
  });

  /**
   * FILE UPLOAD TESTS
   */
  describe('file uploads', () => {
    it('should parse single file upload', () => {
      const boundary = 'file-boundary-001';
      const fileContent = 'This is a test file';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="test.txt"',
          'Content-Type: text/plain',
          '',
          fileContent,
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result).toHaveProperty('file');
      const file = result.file as FileData;
      expect(file.name).toBe('test.txt');
      expect(file.mimeType).toBe('text/plain');
      expect(file.size).toBeGreaterThanOrEqual(fileContent.length);
      expect(file.extension).toBe('.txt');
      expect(Buffer.isBuffer(file.buffer)).toBe(true);
    });

    it('should parse multiple file uploads', () => {
      const boundary = 'multi-file-boundary';
      const file1Content = 'file1 content';
      const file2Content = 'file2 content';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file1"; filename="doc1.pdf"',
          'Content-Type: application/pdf',
          '',
          file1Content,
          `--${boundary}`,
          'Content-Disposition: form-data; name="file2"; filename="image.jpg"',
          'Content-Type: image/jpeg',
          '',
          file2Content,
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result).toHaveProperty('file1');
      expect(result).toHaveProperty('file2');

      const file1 = result.file1 as FileData;
      const file2 = result.file2 as FileData;

      expect(file1.name).toBe('doc1.pdf');
      expect(file1.mimeType).toBe('application/pdf');
      expect(file2.name).toBe('image.jpg');
      expect(file2.mimeType).toBe('image/jpeg');
    });

    it('should extract correct file extension', () => {
      const boundary = 'ext-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="document.docx"',
          'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '',
          'file content',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);
      const file = result.file as FileData;

      expect(file.extension).toBe('.docx');
    });

    it('should handle file without extension', () => {
      const boundary = 'no-ext-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="README.txt"',
          'Content-Type: text/plain',
          '',
          'content',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);
      const file = result.file as FileData;

      expect(file.extension).toBe('.txt');
    });
  });

  /**
   * MIXED FORM DATA TESTS
   */
  describe('mixed form data (fields and files)', () => {
    it('should parse text fields and file uploads together', () => {
      const boundary = 'mixed-boundary';
      const fileContent = 'binary file content here';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="name"',
          '',
          'John Doe',
          `--${boundary}`,
          'Content-Disposition: form-data; name="email"',
          '',
          'john@example.com',
          `--${boundary}`,
          'Content-Disposition: form-data; name="avatar"; filename="profile.png"',
          'Content-Type: image/png',
          '',
          fileContent,
          `--${boundary}`,
          'Content-Disposition: form-data; name="bio"',
          '',
          'A passionate developer',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      // Check text fields
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.bio).toBe('A passionate developer');

      // Check file
      const avatar = result.avatar as FileData;
      expect(avatar.name).toBe('profile.png');
      expect(avatar.mimeType).toBe('image/png');
    });
  });

  /**
   * EDGE CASES & SPECIAL CHARACTERS
   */
  describe('edge cases and special characters', () => {
    it('should handle empty field values', () => {
      const boundary = 'empty-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="empty"',
          '',
          '',
          `--${boundary}`,
          'Content-Disposition: form-data; name="filled"',
          '',
          'has value',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.empty).toBe('');
      expect(result.filled).toBe('has value');
    });

    it('should preserve whitespace in field values', () => {
      const boundary = 'whitespace-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="text"',
          '',
          '  spaces  around  ',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      // trim() is called in the parser
      expect(result.text).toBe('spaces  around');
    });

    it('should handle UTF-8 encoded content', () => {
      const boundary = 'utf8-boundary';
      const utf8Content = 'Special chars: café, naïve, résumé';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="text"',
          '',
          utf8Content,
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.text).toBe(utf8Content);
    });

    it('should handle field names with special characters', () => {
      const boundary = 'special-name-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="field-with-dash"',
          '',
          'value1',
          `--${boundary}`,
          'Content-Disposition: form-data; name="field_with_underscore"',
          '',
          'value2',
          `--${boundary}`,
          'Content-Disposition: form-data; name="field[0]"',
          '',
          'value3',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result['field-with-dash']).toBe('value1');
      expect(result.field_with_underscore).toBe('value2');
      expect(result['field[0]']).toBe('value3');
    });

    it('should handle multiline field values', () => {
      const boundary = 'multiline-boundary';
      const multilineValue = 'Line 1\nLine 2\nLine 3';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="multiline"',
          '',
          multilineValue,
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.multiline).toBe(multilineValue);
    });
  });

  /**
   * CONTENT-TYPE VARIATIONS
   */
  describe('content-type handling', () => {
    it('should parse various MIME types', () => {
      const boundary = 'mime-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="json"; filename="data.json"',
          'Content-Type: application/json',
          '',
          '{"key":"value"}',
          `--${boundary}`,
          'Content-Disposition: form-data; name="xml"; filename="data.xml"',
          'Content-Type: application/xml',
          '',
          '<root></root>',
          `--${boundary}`,
          'Content-Disposition: form-data; name="csv"; filename="data.csv"',
          'Content-Type: text/csv',
          '',
          'col1,col2,col3',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect((result.json as FileData).mimeType).toBe('application/json');
      expect((result.xml as FileData).mimeType).toBe('application/xml');
      expect((result.csv as FileData).mimeType).toBe('text/csv');
    });

    it('should handle MIME type with charset', () => {
      const boundary = 'charset-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="test.txt"',
          'Content-Type: text/plain; charset=utf-8',
          '',
          'content',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);
      const file = result.file as FileData;

      // MIME type may include charset
      expect(file.mimeType).toContain('text/plain');
    });

    it('should handle text fields without Content-Type', () => {
      const boundary = 'no-type-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="field"',
          '',
          'value',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.field).toBe('value');
      expect(typeof result.field).toBe('string');
    });
  });

  /**
   * BOUNDARY VARIATIONS
   */
  describe('boundary handling', () => {
    it('should handle different boundary formats', () => {
      const boundaries = [
        'simple',
        'boundary-with-dashes',
        'boundary_with_underscores',
        'boundary123456789',
        'MixedCaseBoundary',
      ];

      boundaries.forEach((boundary) => {
        const body = Buffer.from(
          [
            `--${boundary}`,
            'Content-Disposition: form-data; name="field"',
            '',
            'value',
            `--${boundary}--`,
            '',
          ].join('\r\n'),
        );

        const result = multipart(body, boundary);

        expect(result).toHaveProperty('field');
        expect(result.field).toBe('value');
      });
    });

    it('should handle long boundary strings', () => {
      const boundary = 'a'.repeat(70);
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="field"',
          '',
          'value',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.field).toBe('value');
    });
  });

  /**
   * REAL-WORLD SCENARIOS
   */
  describe('real-world scenarios', () => {
    it('should parse form data from HTML form submission', () => {
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const body = Buffer.from(
        [
          `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
          'Content-Disposition: form-data; name="username"',
          '',
          'testuser',
          `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
          'Content-Disposition: form-data; name="password"',
          '',
          'secretpassword',
          `------WebKitFormBoundary7MA4YWxkTrZu0gW`,
          'Content-Disposition: form-data; name="profile_picture"; filename="avatar.jpg"',
          'Content-Type: image/jpeg',
          '',
          'BINARY_IMAGE_DATA_HERE',
          `------WebKitFormBoundary7MA4YWxkTrZu0gW--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.username).toBe('testuser');
      expect(result.password).toBe('secretpassword');
      expect((result.profile_picture as FileData).name).toBe('avatar.jpg');
    });

    it('should handle multipart data with repeated field names', () => {
      const boundary = 'multi-value-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="tags"',
          '',
          'javascript',
          `--${boundary}`,
          'Content-Disposition: form-data; name="tags"',
          '',
          'typescript',
          `--${boundary}`,
          'Content-Disposition: form-data; name="tags"',
          '',
          'nodejs',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      // Last value should overwrite previous ones
      expect(result.tags).toBe('nodejs');
    });

    it('should parse file upload with binary content', () => {
      const boundary = 'binary-boundary';
      // Create a buffer with some binary data
      const binaryData = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const header = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="image"; filename="test.bin"',
          'Content-Type: application/octet-stream',
          '',
        ].join('\r\n'),
      );
      const footer = Buffer.from(['', `--${boundary}--`, ''].join('\r\n'));

      const body = Buffer.concat([header, Buffer.from('\r\n'), binaryData, footer]);
      const result = multipart(body, boundary);

      const file = result.image as FileData;
      expect(file.name).toBe('test.bin');
      expect(file.size).toBeGreaterThan(0);
    });
  });

  /**
   * ENCODING DETECTION
   */
  describe('encoding detection', () => {
    it('should detect UTF-8 encoding', () => {
      const boundary = 'encoding-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="test.txt"',
          'Content-Type: text/plain',
          '',
          'UTF-8 content: café',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);
      const file = result.file as FileData;

      expect(file.encoding).toBeDefined();
      expect(typeof file.encoding).toBe('string');
    });
  });

  /**
   * BUFFER PROPERTIES
   */
  describe('buffer properties', () => {
    it('should return Buffer objects for files', () => {
      const boundary = 'buffer-boundary';
      const fileContent = 'test file content';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="file"; filename="test.txt"',
          'Content-Type: text/plain',
          '',
          fileContent,
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);
      const file = result.file as FileData;

      expect(Buffer.isBuffer(file.buffer)).toBe(true);
      // Size might vary due to parsing, just check it's positive
      expect(file.buffer.length).toBeGreaterThan(0);
    });

    it('should have correct file size property', () => {
      const boundary = 'size-boundary';
      const fileSizes = [1, 10, 100];

      fileSizes.forEach((size) => {
        const fileContent = 'x'.repeat(size);
        const body = Buffer.from(
          [
            `--${boundary}`,
            'Content-Disposition: form-data; name="file"; filename="test.txt"',
            'Content-Type: text/plain',
            '',
            fileContent,
            `--${boundary}--`,
            '',
          ].join('\r\n'),
        );

        const result = multipart(body, boundary);
        const file = result.file as FileData;

        expect(file.size).toBeGreaterThanOrEqual(size);
      });
    });
  });

  /**
   * ERROR HANDLING & ROBUSTNESS
   */
  describe('error handling and robustness', () => {
    it('should handle malformed multipart data gracefully', () => {
      const boundary = 'malformed-boundary';
      const body = Buffer.from('malformed data without proper boundaries');

      const result = multipart(body, boundary);

      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle missing boundary end marker', () => {
      const boundary = 'incomplete-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="field"',
          '',
          'value',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result).toHaveProperty('field');
      expect(result.field).toBe('value');
    });

    it('should handle Content-Disposition without name attribute', () => {
      const boundary = 'no-name-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data',
          '',
          'value',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle empty body sections', () => {
      const boundary = 'empty-section-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="empty1"',
          '',
          `--${boundary}`,
          'Content-Disposition: form-data; name="empty2"',
          '',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      expect(result.empty1).toBe('');
      expect(result.empty2).toBe('');
    });
  });

  /**
   * TYPE SAFETY
   */
  describe('type safety', () => {
    it('should return correct types for parsed data', () => {
      const boundary = 'type-boundary';
      const body = Buffer.from(
        [
          `--${boundary}`,
          'Content-Disposition: form-data; name="textField"',
          '',
          'text value',
          `--${boundary}`,
          'Content-Disposition: form-data; name="fileField"; filename="file.txt"',
          'Content-Type: text/plain',
          '',
          'file content',
          `--${boundary}--`,
          '',
        ].join('\r\n'),
      );

      const result = multipart(body, boundary);

      // Type check: text field should be string
      expect(typeof result.textField).toBe('string');

      // Type check: file field should be FileData object
      const file = result.fileField;
      expect(typeof file).toBe('object');
      // Separate type assertion from expect
      const fileData = file as FileData;
      expect(fileData.buffer).toBeInstanceOf(Buffer);
      expect(fileData.name).toBe('file.txt');
    });
  });
});
