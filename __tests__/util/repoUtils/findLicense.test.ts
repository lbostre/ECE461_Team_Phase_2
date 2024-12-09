// __tests__/util/repoUtils/findLicense.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { findLicense } from '../../../src/util/repoUtils';

vi.mock('fs');

describe('findLicense', () => {
  const repoPath = '/path/to/repo';
  const readmePath = '/path/to/repo/README.md';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the license type if a LICENSE file is found', async () => {
    // Mock fs.promises.readdir to return a list of directory entries
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'LICENSE' } as fs.Dirent,
    ]);

    // Mock fs.promises.readFile to return the content of the LICENSE file
    vi.mocked(fs.promises.readFile).mockResolvedValue('MIT License');

    const result = await findLicense(repoPath);

    expect(result).toBe('MIT');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
    expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(repoPath, 'LICENSE'), 'utf8');
  });

  it('should return the license type if a license is found in package.json', async () => {
    // Mock fs.promises.readFile to return the content of the package.json file
    vi.mocked(fs.promises.readFile).mockImplementation((filePath) => {
      if (filePath === path.join(repoPath, 'package.json')) {
        return Promise.resolve(JSON.stringify({ license: 'Apache License, Version 2.0' }));
      }
      return Promise.resolve('');
    });

    const result = await findLicense(repoPath);

    expect(result).toBe('Apache 2.0');
    expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(repoPath, 'package.json'), 'utf8');
  });

  it('should throw an error if no LICENSE file or README file is found', async () => {
    // Mock fs.promises.readdir to return a list of directory entries without a LICENSE file
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'index.js' } as fs.Dirent,
    ]);
    vi.mocked(fs.promises.readFile).mockResolvedValue(new Error('Failed to read file'));


    await expect(findLicense(repoPath)).rejects.toThrow('License information not found in LICENSE files, package.json, or README.');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });

  it('should handle errors during readdir', async () => {
    // Mock fs.promises.readdir to throw an error
    vi.mocked(fs.promises.readdir).mockRejectedValue(new Error('Failed to read directory'));
    vi.mocked(fs.promises.readFile).mockResolvedValue(new Error('Failed to read file'));

    await expect(findLicense(repoPath)).rejects.toThrow('License information not found in LICENSE files, package.json, or README.');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });
});