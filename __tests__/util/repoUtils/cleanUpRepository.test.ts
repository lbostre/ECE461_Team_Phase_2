// Test cleanUpRepository function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { cleanUpRepository } from '../../../src/util/repoUtils';

vi.mock('fs');

describe('cleanUpRepository', () => {
  const repoPath = '/tmp/cloned_repo/repo';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete the repository if it exists and is a directory', async () => {
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock fs.statSync to return a directory
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

    // Mock fs.promises.rm to simulate successful deletion
    vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

    await cleanUpRepository(repoPath);

    expect(fs.existsSync).toHaveBeenCalledWith(repoPath);
    expect(fs.statSync).toHaveBeenCalledWith(repoPath);
    expect(fs.promises.rm).toHaveBeenCalledWith(repoPath, { recursive: true, force: true });
  });

  it('should throw an error if the path does not exist', async () => {
    // Mock fs.existsSync to return false
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(cleanUpRepository(repoPath)).rejects.toThrow('Failed to delete repository: path does not exist or is not a directory');
    expect(fs.existsSync).toHaveBeenCalledWith(repoPath);
    expect(fs.statSync).not.toHaveBeenCalled();
    expect(fs.promises.rm).not.toHaveBeenCalled();
  });

  it('should throw an error if the path is not a directory', async () => {
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock fs.statSync to return a non-directory
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as fs.Stats);

    await expect(cleanUpRepository(repoPath)).rejects.toThrow('Failed to delete repository: path does not exist or is not a directory');
    expect(fs.existsSync).toHaveBeenCalledWith(repoPath);
    expect(fs.statSync).toHaveBeenCalledWith(repoPath);
    expect(fs.promises.rm).not.toHaveBeenCalled();
  });

  it('should handle errors during deletion', async () => {
    // Mock fs.existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock fs.statSync to return a directory
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as fs.Stats);

    // Mock fs.promises.rm to throw an error
    vi.mocked(fs.promises.rm).mockRejectedValue(new Error('Deletion failed'));

    await expect(cleanUpRepository(repoPath)).rejects.toThrow('Deletion failed');
    expect(fs.existsSync).toHaveBeenCalledWith(repoPath);
    expect(fs.statSync).toHaveBeenCalledWith(repoPath);
    expect(fs.promises.rm).toHaveBeenCalledWith(repoPath, { recursive: true, force: true });
  });
});