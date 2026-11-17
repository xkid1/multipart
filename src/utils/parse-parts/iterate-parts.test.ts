import { describe, expect, it } from 'vitest';

import { iterateParts } from './iterate-parts';
import { splitPartSections } from './split-part-sections';

const bodies = (body: string, boundary = 'b') =>
  [...iterateParts(Buffer.from(body), boundary)].map((p) => p.bodySection.toString());

describe('iterateParts', () => {
  it('yields exact part bodies', () => {
    expect(
      bodies('--b\r\nH: 1\r\n\r\none\r\n--b\r\nH: 2\r\n\r\ntwo\r\n--b--\r\n'),
    ).toEqual(['one', 'two']);
  });

  it('yields nothing for an empty boundary or no boundary in the body', () => {
    expect(bodies('--b\r\nH: 1\r\n\r\none\r\n--b--', '')).toEqual([]);
    expect(bodies('no boundary here')).toEqual([]);
  });

  it('allows transport padding after the boundary', () => {
    expect(bodies('--b  \t\r\nH: 1\r\n\r\none\r\n--b--')).toEqual(['one']);
  });

  it('treats a longer boundary-like token as content', () => {
    expect(bodies('--b\r\nH: 1\r\n\r\nx\r\n--bc\r\ny\r\n--b--')).toEqual([
      'x\r\n--bc\r\ny',
    ]);
  });

  it('runs the last part to the end when the close delimiter is missing', () => {
    expect(bodies('--b\r\nH: 1\r\n\r\ntail\r\n')).toEqual(['tail']);
    expect(bodies('--b\r\nH: 1\r\n\r\ntail')).toEqual(['tail']);
  });

  it('stops at a boundary that ends the body without CRLF', () => {
    expect(bodies('--b\r\nH: 1\r\n\r\none\r\n--b')).toEqual(['one']);
  });

  it('stops when the first boundary line is malformed', () => {
    expect(bodies('--bX\r\nH: 1\r\n\r\none\r\n--b--')).toEqual([]);
  });
});

describe('splitPartSections', () => {
  it('returns null when there is no header block', () => {
    expect(splitPartSections(Buffer.from('no headers'))).toBeNull();
    expect(splitPartSections(Buffer.from('\r\n'))).toBeNull();
  });

  it('treats a header-only part ending in CRLF as an empty body', () => {
    expect(splitPartSections(Buffer.from('H: 1\r\n'))).toMatchObject({
      headerSection: 'H: 1',
    });
    expect(splitPartSections(Buffer.from('H: 1\r\n'))?.bodySection.length).toBe(0);
  });
});
