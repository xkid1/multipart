/**
 * Extract file extension from filename
 * @param filename - The filename
 * @returns Extension with dot prefix or empty string
 */
export const extractExtension = (filename: string): string => {
  const extension = filename.split('.').pop();
  return extension ? `.${extension}` : '';
};
