// Ambient type declarations for optional peer dependencies

declare module 'express' {
  export interface Request {
    headers: Record<string, string | string[] | undefined>;
    method?: string;
    on(event: string, listener: (...args: any[]) => void): this;
    pause(): this;
    [key: string]: unknown;
  }
  export interface Response {
    status(code: number): this;
    json(body: unknown): this;
    [key: string]: unknown;
  }
  export type NextFunction = (err?: unknown) => void;
}

declare module '@nestjs/common' {
  export interface NestMiddleware {
    use(req: unknown, res: unknown, next: (error?: unknown) => void): unknown;
  }
  export class BadRequestException extends Error {
    constructor(message?: string);
  }
}

declare module '@aws-sdk/client-s3' {
  export interface PutObjectCommandInput {
    Bucket?: string;
    Key?: string;
    Body?: unknown;
    ContentType?: string;
    Metadata?: Record<string, string>;
    ACL?: unknown;
    ServerSideEncryption?: unknown;
    SSEKMSKeyId?: string;
    StorageClass?: unknown;
    Tagging?: string;
    [key: string]: unknown;
  }

  export interface DeleteObjectCommandInput {
    Bucket?: string;
    Key?: string;
  }

  export interface GetObjectCommandInput {
    Bucket?: string;
    Key?: string;
  }

  export class PutObjectCommand {
    readonly input: PutObjectCommandInput;
    constructor(input: PutObjectCommandInput);
  }

  export class DeleteObjectCommand {
    readonly input: DeleteObjectCommandInput;
    constructor(input: DeleteObjectCommandInput);
  }

  export class GetObjectCommand {
    readonly input: GetObjectCommandInput;
    constructor(input: GetObjectCommandInput);
  }
}

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(
    client: unknown,
    command: unknown,
    options?: { expiresIn?: number },
  ): Promise<string>;
}

declare module '@azure/storage-blob' {
  export class BlobSASPermissions {
    static parse(permissions: string): unknown;
  }
  export function generateBlobSASQueryParameters(
    options: unknown,
    credential: unknown,
  ): { toString(): string };
  export class StorageSharedKeyCredential {
    constructor(accountName: string, accountKey: string);
  }
}
