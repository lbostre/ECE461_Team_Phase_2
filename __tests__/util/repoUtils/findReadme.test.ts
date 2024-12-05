// Test findReadme function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { findReadme } from '../../../src/util/repoUtils';

vi.mock('fs');

describe('findReadme', () => {
  const repoPath = '/path/to/repo';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the path to the README file if it exists', async () => {
    // Mock fs.promises.readdir to return a list of directory entries
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'README.md' } as fs.Dirent,
      { isFile: () => true, name: 'index.js' } as fs.Dirent,
    ]);

    const result = await findReadme(repoPath);

    expect(result).toBe(path.join(repoPath, 'README.md'));
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });

  it('should return null if no README file is found', async () => {
    // Mock fs.promises.readdir to return a list of directory entries without a README file
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'index.js' } as fs.Dirent,
      { isFile: () => true, name: 'main.css' } as fs.Dirent,
    ]);

    const result = await findReadme(repoPath);

    expect(result).toBeNull();
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });

  it('should handle case insensitive README file names', async () => {
    // Mock fs.promises.readdir to return a list of directory entries with a case insensitive README file
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isFile: () => true, name: 'readme.md' } as fs.Dirent,
      { isFile: () => true, name: 'index.js' } as fs.Dirent,
    ]);

    const result = await findReadme(repoPath);

    expect(result).toBe(path.join(repoPath, 'readme.md'));
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });

  it('should handle errors during readdir', async () => {
    // Mock fs.promises.readdir to throw an error
    vi.mocked(fs.promises.readdir).mockRejectedValue(new Error('Failed to read directory'));

    await expect(findReadme(repoPath)).rejects.toThrow('Failed to read directory');
    expect(fs.promises.readdir).toHaveBeenCalledWith(repoPath, { withFileTypes: true });
  });
});