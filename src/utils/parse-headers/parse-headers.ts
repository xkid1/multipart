/**
 * Parse multipart headers from a header string
 * @param headerSection - The raw header section as string
 * @returns Object with contentDisposition and contentType headers
 */
export const parseHeaders = (headerSection: string) => {
  const headers = headerSection.split('\r\n');
  const contentDisposition = headers.find((header) =>
    header.startsWith('Content-Disposition'),
  );
  const contentType = headers.find((header) => header.startsWith('Content-Type'));

  return { contentDisposition, contentType };
};
