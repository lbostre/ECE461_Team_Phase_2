// Test findLicense function

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

    const result = await findLicense(repoPath, null);

    expect(result).toBe('MIT');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
    expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(repoPath, 'LICENSE'), 'utf8');
  });

  it('should return the license type if a LICENSE file is found with a different name', async () => {
    // Mock fs.promises.readdir to return a list of directory entries
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'LICENSE.txt' } as fs.Dirent,
    ]);

    // Mock fs.promises.readFile to return the content of the LICENSE file
    vi.mocked(fs.promises.readFile).mockResolvedValue('Apache License, Version 2.0');

    const result = await findLicense(repoPath, null);

    expect(result).toBe('Apache 2.0');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
    expect(fs.promises.readFile).toHaveBeenCalledWith(path.join(repoPath, 'LICENSE.txt'), 'utf8');
  });

  it('should return the license type if a LICENSE file is found in the README file', async () => {
    // Mock fs.promises.readdir to return a list of directory entries without a LICENSE file
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'README.md' } as fs.Dirent,
    ]);

    // Mock fs.promises.readFile to return the content of the README file
    vi.mocked(fs.promises.readFile).mockResolvedValue('This project is licensed under the MIT License.');

    const result = await findLicense(repoPath, readmePath);

    expect(result).toBe('MIT');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
    expect(fs.promises.readFile).toHaveBeenCalledWith(readmePath, 'utf8');
  });

  it('should throw an error if no LICENSE file or README file is found', async () => {
    // Mock fs.promises.readdir to return a list of directory entries without a LICENSE file
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'index.js' } as fs.Dirent,
    ]);

    await expect(findLicense(repoPath, null)).rejects.toThrow('Readme file not found');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });

  it('should handle errors during readdir', async () => {
    // Mock fs.promises.readdir to throw an error
    vi.mocked(fs.promises.readdir).mockRejectedValue(new Error('Failed to read directory'));

    await expect(findLicense(repoPath, null)).rejects.toThrow('Failed to read directory');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });
});