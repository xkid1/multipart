/**
 * Regression tests for parser bugs fixed in 0.3.0, plus round-trip and fuzz
 * tests against Node's own multipart encoder (FormData + Request).
 */
import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { extractBoundary } from '../form-data/content-type.js';

import multipart from './multipart.js';
import { parseMultipartWithDuplicates } from './parse-multipart.js';

import type { FileData } from '../../types/index.js';

const B = 'XyZ';

/** Build a body from parts given as [headerLines, content]. */
const buildBody = (...parts: [string[], string | Buffer][]): Buffer =>
  Buffer.concat([
    ...parts.flatMap(([headers, content]) => [
      Buffer.from(`--${B}\r\n${headers.join('\r\n')}\r\n\r\n`),
      Buffer.isBuffer(content) ? content : Buffer.from(content),
      Buffer.from('\r\n'),
    ]),
    Buffer.from(`--${B}--\r\n`),
  ]);

const fileHeaders = (
  name: string,
  filename: string,
  type = 'application/octet-stream',
) => [
  `Content-Disposition: form-data; name="${name}"; filename="${filename}"`,
  `Content-Type: ${type}`,
];

/** Encode a FormData exactly as Node's fetch (undici) sends it. */
const encode = async (form: FormData): Promise<{ body: Buffer; boundary: string }> => {
  const request = new Request('http://localhost/', { method: 'POST', body: form });
  const boundary = extractBoundary(request.headers.get('content-type') ?? '');
  if (!boundary) throw new Error('no boundary');
  return { body: Buffer.from(await request.arrayBuffer()), boundary };
};

describe('parser regressions', () => {
  it('returns file bytes exactly, without the CRLF that precedes the next boundary', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    const file = multipart(buildBody([fileHeaders('f', 'a.png', 'image/png'), png]), B)
      .f as FileData;

    expect(file.buffer.equals(png)).toBe(true);
    expect(file.size).toBe(png.length);
  });

  it('preserves leading/trailing whitespace and newlines in field values', () => {
    const value = '  line 1\r\nline 2\r\n  ';
    const result = multipart(
      buildBody([['Content-Disposition: form-data; name="t"'], value]),
      B,
    );
    expect(result.t).toBe(value);
  });

  it('matches header names case-insensitively', () => {
    const result = multipart(
      buildBody([
        [
          'content-disposition: form-data; name="f"; filename="a.txt"',
          'CONTENT-TYPE: Text/Plain',
        ],
        'x',
      ]),
      B,
    );
    expect((result.f as FileData).mimeType).toBe('text/plain');
  });

  it('does not read the field name from the filename parameter', () => {
    const result = multipart(
      buildBody([
        [
          'Content-Disposition: form-data; filename="a.txt"; name="doc"',
          'Content-Type: text/plain',
        ],
        'x',
      ]),
      B,
    );
    expect(Object.keys(result)).toEqual(['doc']);
    expect((result.doc as FileData).name).toBe('a.txt');
  });

  it('treats a part with a filename but no Content-Type as a file', () => {
    const result = multipart(
      buildBody([['Content-Disposition: form-data; name="f"; filename="a.bin"'], 'x']),
      B,
    );
    expect(result.f).toMatchObject({
      name: 'a.bin',
      mimeType: 'application/octet-stream',
    });
  });

  it('strips Content-Type parameters from mimeType', () => {
    const result = multipart(
      buildBody([fileHeaders('f', 'a.txt', 'text/plain; charset=utf-8'), 'x']),
      B,
    );
    expect((result.f as FileData).mimeType).toBe('text/plain');
  });

  it('does not split on boundary-like text inside content', () => {
    const tricky = `a--${B}b\r\n--${B}x\n--${B}`;
    const result = multipart(
      buildBody([['Content-Disposition: form-data; name="t"'], tricky]),
      B,
    );
    expect(result.t).toBe(tricky);
  });

  it('ignores a preamble before the first boundary and an epilogue after the last', () => {
    const body = Buffer.concat([
      Buffer.from('this is a preamble\r\n'),
      buildBody([['Content-Disposition: form-data; name="t"'], 'v']),
      Buffer.from('epilogue'),
    ]);
    expect({ ...multipart(body, B) }).toEqual({ t: 'v' });
  });

  it('accepts exactly maxFields fields and maxFiles files', () => {
    const body = buildBody(
      [['Content-Disposition: form-data; name="t"'], 'v'],
      [fileHeaders('f', 'a.txt'), 'x'],
    );
    const result = parseMultipartWithDuplicates(body, B, { maxFields: 1, maxFiles: 1 });
    expect(result.t).toBe('v');
    expect((result.f as FileData).name).toBe('a.txt');
  });

  it('rejects one field or file over the limit', () => {
    const twoFields = buildBody(
      [['Content-Disposition: form-data; name="a"'], '1'],
      [['Content-Disposition: form-data; name="b"'], '2'],
    );
    expect(() => parseMultipartWithDuplicates(twoFields, B, { maxFields: 1 })).toThrow(
      expect.objectContaining({ code: 'LIMIT_FIELDS', statusCode: 413 }),
    );
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'stores a field named %s as plain data without touching prototypes',
    (name) => {
      const body = buildBody(
        [fileHeaders(name, 'a.txt'), 'x'],
        [[`Content-Disposition: form-data; name="${name}"`], 'second'],
      );
      const result = parseMultipartWithDuplicates(body, B);

      expect(Object.getPrototypeOf(result)).toBeNull();
      expect(Object.keys(result)).toEqual([name]);
      expect(result[name]).toHaveLength(2);
      expect(({} as Record<string, unknown>).name).toBeUndefined();
    },
  );

  it('skips an empty file input (filename="" with no content)', () => {
    const body = buildBody(
      [fileHeaders('avatar', ''), ''],
      [['Content-Disposition: form-data; name="t"'], 'v'],
    );
    const result = parseMultipartWithDuplicates(body, B);
    expect(Object.keys(result)).toEqual(['t']);
  });

  it('decodes RFC 5987 filename* (UTF-8 names)', () => {
    const result = multipart(
      buildBody([
        [
          `Content-Disposition: form-data; name="f"; filename="fallback.txt"; filename*=UTF-8''na%C3%AFve%20r%C3%A9sum%C3%A9.txt`,
        ],
        'x',
      ]),
      B,
    );
    expect((result.f as FileData).name).toBe('naïve résumé.txt');
  });

  it('accepts unquoted and escaped-quote parameter values', () => {
    const result = multipart(
      buildBody(
        [['Content-Disposition: form-data; name=plain'], '1'],
        [[String.raw`Content-Disposition: form-data; name="say \"hi\""`], '2'],
      ),
      B,
    );
    expect(result.plain).toBe('1');
    expect(result['say "hi"']).toBe('2');
  });

  it('supports wildcard and case-insensitive allowedMimeTypes', () => {
    const body = buildBody([fileHeaders('f', 'a.PNG', 'IMAGE/PNG'), 'x']);
    expect(() =>
      parseMultipartWithDuplicates(body, B, { allowedMimeTypes: ['image/*'] }),
    ).not.toThrow();
    expect(() =>
      parseMultipartWithDuplicates(body, B, { allowedMimeTypes: ['Image/Png'] }),
    ).not.toThrow();
    expect(() =>
      parseMultipartWithDuplicates(body, B, { allowedMimeTypes: ['image/jpeg'] }),
    ).toThrow(
      expect.objectContaining({ code: 'MIME_TYPE_NOT_ALLOWED', statusCode: 415 }),
    );
  });

  it('checks fieldSize before decoding the value', () => {
    const body = buildBody([['Content-Disposition: form-data; name="t"'], 'abcdef']);
    expect(() => parseMultipartWithDuplicates(body, B, { fieldSize: 5 })).toThrow(
      expect.objectContaining({ code: 'LIMIT_FIELD_SIZE', size: 6, limit: 5 }),
    );
  });
});

describe('round-trip with Node FormData encoding', () => {
  it('parses what the platform encoder produces, byte for byte', async () => {
    const binary = Buffer.concat([randomBytes(4096), Buffer.from('\r\n--\r\n\r\n')]);
    const form = new FormData();
    form.append('title', 'Hello, wörld 🚀');
    form.append('tags', 'a');
    form.append('tags', 'b');
    form.append(
      'doc',
      new Blob([binary], { type: 'application/pdf' }),
      'report.final.pdf',
    );
    form.append('empty', new Blob([]), 'empty.txt');

    const { body, boundary } = await encode(form);
    const result = parseMultipartWithDuplicates(body, boundary);

    expect(result.title).toBe('Hello, wörld 🚀');
    expect(result.tags).toEqual(['a', 'b']);
    const doc = result.doc as FileData;
    expect(doc.buffer.equals(binary)).toBe(true);
    expect(doc).toMatchObject({
      name: 'report.final.pdf',
      extension: '.pdf',
      mimeType: 'application/pdf',
    });
    expect((result.empty as FileData).size).toBe(0);
  });

  it('fuzz: random binary files and fields survive a round trip', async () => {
    for (let run = 0; run < 50; run++) {
      const form = new FormData();
      const expected = new Map<string, Buffer | string>();
      const partCount = 1 + (run % 6);

      for (let i = 0; i < partCount; i++) {
        const name = `p${i}`;
        if ((run + i) % 2 === 0) {
          // Seed content with CR/LF/dash runs to stress delimiter detection.
          const content = Buffer.concat([
            randomBytes(run * 13 + i),
            Buffer.from('\r\n--\r\n-'),
            randomBytes(i * 7),
          ]);
          form.append(name, new Blob([content]), `f${i}.bin`);
          expected.set(name, content);
        } else {
          const text = `v${run}-${i}\r\n ${'-'.repeat(i)}`;
          form.append(name, text);
          expected.set(name, text);
        }
      }

      const { body, boundary } = await encode(form);
      const result = parseMultipartWithDuplicates(body, boundary);

      const actual = new Map(
        [...expected.keys()].map((name) => {
          const value = result[name];
          return [name, typeof value === 'string' ? value : (value as FileData).buffer];
        }),
      );
      expect(actual).toEqual(expected);
    }
  });

  it('fuzz: truncated and corrupted bodies never throw from the lenient parser', async () => {
    const form = new FormData();
    form.append('a', 'value');
    form.append('f', new Blob([randomBytes(256)]), 'x.bin');
    const { body, boundary } = await encode(form);

    for (let cut = 0; cut <= body.length; cut += 7) {
      expect(() => multipart(body.subarray(0, cut), boundary)).not.toThrow();
    }
    for (let i = 0; i < 200; i++) {
      const corrupted = Buffer.from(body);
      corrupted[i % corrupted.length] = (i * 31) & 0xff;
      expect(() => multipart(corrupted, boundary)).not.toThrow();
    }
  });
});
