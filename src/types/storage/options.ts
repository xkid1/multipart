/**
 * Minimal SDK client interfaces the storage helpers depend on. The real
 * `S3Client` and `ContainerClient` satisfy them, and tests can pass simple mocks.
 * @module @xkid1/multipart/types/storage
 */

/**
 * S3 client interface - properties used in upload operations
 */
export interface S3ClientInterface {
  /** Send method for executing commands */
  send(command: unknown): Promise<unknown>;
}

/**
 * Azure Blob Container Client interface - properties used in upload operations
 */
export interface AzureBlobContainerClientInterface {
  /** Container name property */
  containerName: string;

  /** Optional account name property */
  accountName?: string;

  /** Get block blob client for blob operations */
  getBlockBlobClient(blobName: string): AzureBlobClientInterface;
}

/**
 * Azure Blob Client interface - properties used in upload operations
 */
export interface AzureBlobClientInterface {
  /** Blob URL property */
  url: string;

  /** Upload blob data */
  upload(
    data: Buffer | ArrayBuffer | Uint8Array,
    length: number,
    options?: Record<string, unknown>,
  ): Promise<AzureBlobUploadResultInterface>;

  /** Delete the blob */
  delete(): Promise<unknown>;

  /** Whether the blob exists */
  exists(): Promise<boolean>;
}

/**
 * Azure Blob upload result interface
 */
export interface AzureBlobUploadResultInterface {
  /** ETag of the uploaded blob */
  etag?: string;

  /** Last modified timestamp */
  lastModified?: Date;

  /** Version ID if applicable */
  versionId?: string;

  /** Encryption scope used, if any */
  encryptionScope?: string;
}
