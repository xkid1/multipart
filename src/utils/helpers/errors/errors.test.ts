import { describe, expect, it } from 'vitest';

import { MultiPartError } from './errors';

describe('MultiPartError', () => {
  it('should initialize with message, code and name', () => {
    const error = new MultiPartError('Test failure', 'TEST_CODE');
    expect(error.name).toBe('MultiPartError');
    expect(error.message).toBe('Test failure');
    expect(error.code).toBe('TEST_CODE');
    expect(error).toBeInstanceOf(Error);
  });

  it('should support error options such as cause', () => {
    const cause = new Error('Root cause');
    const error = new MultiPartError('Failed', 'CODE', { cause });
    expect(error.cause).toBe(cause);
  });
});
