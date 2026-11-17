/**
 * Extract the file extension from a filename.
 *
 * Works on both `/` and `\` paths (some browsers send `C:\fakepath\a.txt`).
 * Names with no dot, or only a leading dot (`README`, `.env`), have no extension.
 *
 * @param filename - The filename
 * @returns The last extension with its dot (`.gz` for `a.tar.gz`), or `''`
 */
export const extractExtension = (filename: string): string => {
  const basename = filename.split(/[/\\]/).pop() ?? '';
  const dotIndex = basename.lastIndexOf('.');
  return dotIndex > 0 && dotIndex < basename.length - 1 ? basename.slice(dotIndex) : '';
};
