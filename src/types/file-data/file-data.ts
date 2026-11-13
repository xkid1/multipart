export interface FileData {
  name: string;
  mimeType: string;
  size: number;
  encoding: string;
  extension: string;
  buffer: Buffer;
}

export type UploadedFile = FileData;
