/**
 * Type declarations for @aws-sdk/s3-request-presigner
 * This is an optional dependency for generating presigned URLs.
 */
declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(
    client: unknown,
    command: unknown,
    options: unknown,
  ): Promise<string>;
}
