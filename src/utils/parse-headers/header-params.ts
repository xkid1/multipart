/**
 * Read a parameter from a header value such as
 * `form-data; name="avatar"; filename="me.png"`.
 *
 * - Parameter names are case-insensitive (RFC 7578 §4.2).
 * - Values may be quoted (`name="a b"`, with `\"` escapes) or bare tokens (`name=a`).
 * - The parameter must start a segment, so looking up `name` never matches
 *   inside `filename=`.
 *
 * @param header - Header value or full header line
 * @param param - Parameter name to look up (e.g. `name`, `filename`)
 * @returns The unquoted value, or `undefined` when the parameter is absent
 */
export const getHeaderParam = (header: string, param: string): string | undefined => {
  // eslint-disable-next-line security/detect-non-literal-regexp -- param is a fixed internal name, never user input
  const pattern = new RegExp(
    `(?:^|[;:\\s])${param}\\s*=\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|([^;\\s]+))`,
    'i',
  );
  const match = pattern.exec(header);
  if (!match) return undefined;

  // Capture groups that did not participate are undefined at runtime.
  const quoted: string | undefined = match[1];
  return quoted === undefined ? match[2] : quoted.replace(/\\(.)/g, '$1');
};

/**
 * Find a header line by name, case-insensitively, and return its value.
 *
 * @param lines - Raw header lines (`Name: value`)
 * @param name - Header name to find
 * @returns The full header line, or `undefined` if absent
 */
export const findHeaderLine = (lines: string[], name: string): string | undefined => {
  const prefix = `${name.toLowerCase()}:`;
  return lines.find((line) => line.trimStart().toLowerCase().startsWith(prefix));
};
