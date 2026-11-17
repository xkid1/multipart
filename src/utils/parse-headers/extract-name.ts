import { getHeaderParam } from './header-params';

/**
 * Extract the field name from a Content-Disposition header.
 *
 * @param contentDisposition - The Content-Disposition header line or value
 * @returns The field name, or `undefined` when missing or empty
 */
export const extractName = (
  contentDisposition: string | undefined,
): string | undefined => {
  if (!contentDisposition) return undefined;
  const name = getHeaderParam(contentDisposition, 'name');
  return name === '' ? undefined : name;
};
