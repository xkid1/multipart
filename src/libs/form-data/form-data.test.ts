import { describe, expect, it } from 'vitest';

import { extractBoundary, firstHeaderValue, isMultipartFormData } from './content-type';
import { isFileData, splitFormData } from './split-form-data';

import type { FileData } from '@types';

const file = (name: string): FileData => ({
  name,
  mimeType: 'text/plain',
  size: 1,
  encoding: 'utf-8',
  extension: '.txt',
  buffer: Buffer.from('x'),
});

describe('content-type helpers', () => {
  it.each([
    ['multipart/form-data; boundary=x', true],
    ['Multipart/Form-Data;boundary=x', true],
    ['multipart/form-data', true],
    ['multipart/mixed; boundary=x', false],
    ['application/json; note=multipart/form-data', false],
    [undefined, false],
  ])('isMultipartFormData(%s) = %s', (input, expected) => {
    expect(isMultipartFormData(input)).toBe(expected);
  });

  it.each([
    ['multipart/form-data; boundary=abc', 'abc'],
    ['multipart/form-data; boundary="a b;c"', 'a b;c'],
    ['multipart/form-data; Boundary=X; charset=utf-8', 'X'],
    ['multipart/form-data; boundary=', undefined],
    ['multipart/form-data', undefined],
    [undefined, undefined],
  ])('extractBoundary(%s) = %s', (input, expected) => {
    expect(extractBoundary(input)).toBe(expected);
  });

  it('firstHeaderValue unwraps arrays', () => {
    expect(firstHeaderValue(['a', 'b'])).toBe('a');
    expect(firstHeaderValue('a')).toBe('a');
    expect(firstHeaderValue(undefined)).toBeUndefined();
  });
});

describe('splitFormData', () => {
  it('splits files and fields, keeping arrays for repeated names', () => {
    const { files, fields } = splitFormData({
      title: 't',
      tags: ['a', 'b'],
      doc: file('d.txt'),
      docs: [file('1.txt'), file('2.txt')],
    });

    expect({ ...fields }).toEqual({ title: 't', tags: ['a', 'b'] });
    expect(Object.keys(files)).toEqual(['doc', 'docs']);
    expect(files.docs).toHaveLength(2);
  });

  it('classifies each value of a mixed name on its own', () => {
    const { files, fields } = splitFormData({ mixed: ['text', file('a.txt'), 'more'] });

    expect(fields.mixed).toEqual(['text', 'more']);
    expect((files.mixed as FileData).name).toBe('a.txt');
  });

  it('isFileData rejects non-file values', () => {
    expect(isFileData(null)).toBe(false);
    expect(isFileData('x')).toBe(false);
    expect(isFileData({ buffer: 'not a buffer' })).toBe(false);
    expect(isFileData(file('a'))).toBe(true);
  });
});
