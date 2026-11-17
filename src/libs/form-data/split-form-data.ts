import type { FileData, ParsedFormData } from '@types';

/** Files and text fields of a parsed form, keyed by field name. */
export interface SplitFormData {
  files: Record<string, FileData | FileData[]>;
  fields: Record<string, string | string[]>;
}

/** Type guard for {@link FileData} values in parsed form data. */
export const isFileData = (value: unknown): value is FileData =>
  typeof value === 'object' &&
  value !== null &&
  Buffer.isBuffer((value as FileData).buffer);

const singleOrArray = <T>(values: T[]): T | T[] =>
  values.length === 1 ? values[0] : values;

/**
 * Split parsed form data into `files` and `fields`.
 *
 * Each value is classified on its own, so a name used for both a file and a text
 * field appears in both maps. A name with one value maps to that value; a name
 * with several maps to an array.
 */
export const splitFormData = (data: ParsedFormData): SplitFormData => {
  const files: SplitFormData['files'] = Object.create(null) as SplitFormData['files'];
  const fields: SplitFormData['fields'] = Object.create(null) as SplitFormData['fields'];

  for (const [name, value] of Object.entries(data)) {
    const values = Array.isArray(value) ? value : [value];
    const fileValues = values.filter(isFileData);
    const textValues = values.filter((v): v is string => typeof v === 'string');

    if (fileValues.length > 0) files[name] = singleOrArray(fileValues);
    if (textValues.length > 0) fields[name] = singleOrArray(textValues);
  }

  return { files, fields };
};
