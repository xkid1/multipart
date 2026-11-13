/**
 * Storage integration module for multipart uploads
 *
 * Provides optional integrations for uploading parsed multipart files to
 * local filesystem, AWS S3, Azure Blob Storage, and other storage providers.
 *
 * Each storage provider is optional and requires the corresponding SDK
 * to be installed separately (except local filesystem which uses Node.js fs).
 *
 * @module @xkid1/multipart/storage
 */

export * from './azure';
export * from './local';
export * from './s3';
