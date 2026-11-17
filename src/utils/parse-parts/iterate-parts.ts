import { splitPartSections } from './split-part-sections.js';

/** A single body part, split into its raw header block and body bytes. */
export interface RawPart {
  /** Raw header block, lines separated by CRLF. */
  headerSection: string;
  /** Exact body bytes of the part. Shares memory with the input buffer. */
  bodySection: Buffer;
}

const CR = 0x0d;
const LF = 0x0a;
const DASH = 0x2d;
const SPACE = 0x20;
const TAB = 0x09;

/**
 * Where a boundary line ends, given the index just after `--boundary`.
 *
 * A real boundary line is followed by `--` (the close delimiter) or by optional
 * whitespace and CRLF. Anything else means the bytes only *look* like a
 * boundary prefix (e.g. `--abc` inside `--abcdef`) and are part of the content.
 */
const readBoundaryLine = (
  body: Buffer,
  afterBoundary: number,
): { isClose: true } | { isClose: false; partStart: number } | null => {
  if (body[afterBoundary] === DASH && body[afterBoundary + 1] === DASH) {
    return { isClose: true };
  }

  let i = afterBoundary;
  while (body[i] === SPACE || body[i] === TAB) i++;
  if (body[i] === CR && body[i + 1] === LF) return { isClose: false, partStart: i + 2 };

  // A boundary at the very end of a truncated body is treated as a close.
  return i >= body.length ? { isClose: true } : null;
};

/**
 * Find the next real delimiter (`CRLF--boundary` + valid line ending) at or after `from`.
 */
const findDelimiter = (body: Buffer, delimiter: Buffer, from: number): number => {
  let index = body.indexOf(delimiter, from);
  while (index !== -1 && !readBoundaryLine(body, index + delimiter.length)) {
    index = body.indexOf(delimiter, index + 1);
  }
  return index;
};

/**
 * Iterate over the body parts of a `multipart/form-data` payload (RFC 2046 §5.1.1).
 *
 * The CRLF before each delimiter belongs to the delimiter, not the part, so
 * yielded bodies are byte-exact. Any preamble before the first boundary and the
 * epilogue after the close delimiter are ignored. Parts with no header/body
 * separator are skipped.
 *
 * If the close delimiter is missing (e.g. a truncated upload), the last part
 * runs to the end of the input, minus one trailing CRLF.
 *
 * @param body - The complete multipart body
 * @param boundary - The boundary from the Content-Type header (without leading dashes)
 */
export function* iterateParts(body: Buffer, boundary: string): Generator<RawPart> {
  if (!boundary) return;

  const dashBoundary = Buffer.from(`--${boundary}`);
  const delimiter = Buffer.from(`\r\n--${boundary}`);

  // The first boundary may start the body, or follow a preamble + CRLF.
  let boundaryEnd: number;
  if (body.subarray(0, dashBoundary.length).equals(dashBoundary)) {
    boundaryEnd = dashBoundary.length;
  } else {
    const first = findDelimiter(body, delimiter, 0);
    if (first === -1) return;
    boundaryEnd = first + delimiter.length;
  }

  for (;;) {
    const line = readBoundaryLine(body, boundaryEnd);
    if (!line || line.isClose) return;

    const next = findDelimiter(body, delimiter, line.partStart);
    let partEnd = next === -1 ? body.length : next;
    if (next === -1 && body[partEnd - 2] === CR && body[partEnd - 1] === LF) partEnd -= 2;

    const sections = splitPartSections(body.subarray(line.partStart, partEnd));
    if (sections) yield sections;

    if (next === -1) return;
    boundaryEnd = next + delimiter.length;
  }
}
