// Test fileExists function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { fileExists } from '../../../src/util/repoUtils';

vi.mock('fs');

describe('fileExists', () => {
  const filePath = '/path/to/file';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true if the file exists', async () => {
    // Mock fs.promises.access to resolve without error
    vi.mocked(fs.promises.access).mockResolvedValue(undefined);

    const result = await fileExists(filePath);

    expect(result).toBe(true);
    expect(fs.promises.access).toHaveBeenCalledWith(filePath, fs.constants.F_OK);
  });

  it('should return false if the file does not exist', async () => {
    // Mock fs.promises.access to reject with an error
    vi.mocked(fs.promises.access).mockRejectedValue(new Error('File not found'));

    const result = await fileExists(filePath);

    expect(result).toBe(false);
    expect(fs.promises.access).toHaveBeenCalledWith(filePath, fs.constants.F_OK);
  });
});