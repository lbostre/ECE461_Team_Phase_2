// Test cloneRepo function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import git from 'isomorphic-git';
import { cloneRepo } from '../../../src/util/repoUtils';

vi.mock('fs');
vi.mock('isomorphic-git');

describe('cloneRepo', () => {
    const githubUrl = 'https://github.com/user/repo';
    const tempRepoPath = path.join('/tmp', 'cloned_repo', 'repo');

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should clone an actual repository to the temporary path', async () => {
        const actualRepoUrl = 'https://github.com/octocat/Hello-World';
        const actualTempRepoPath = path.join('/tmp', 'cloned_repo', 'Hello-World');

        // Mock fs.existsSync to return false initially and true after mkdirSync
        vi.mocked(fs.existsSync).mockImplementation((path) => path === actualTempRepoPath);

        // Mock fs.mkdirSync to create the directory
        vi.mocked(fs.mkdirSync).mockImplementation(() => tempRepoPath);

        // Mock git.clone to simulate cloning the repository
        vi.mocked(git.clone).mockResolvedValue(undefined);

        const result = await cloneRepo(actualRepoUrl);

        expect(result).toBe(actualTempRepoPath);
        expect(fs.existsSync).toHaveBeenCalledWith(actualTempRepoPath);
        expect(git.clone).toHaveBeenCalledWith({
        fs,
        http: expect.anything(),
        dir: actualTempRepoPath,
        url: actualRepoUrl,
        singleBranch: true,
        depth: 1,
        });
    });

    it('should throw an error if cloning fails', async () => {
        // Mock fs.existsSync to return false initially and true after mkdirSync
        vi.mocked(fs.existsSync).mockImplementation((path) => path === tempRepoPath);

        // Mock fs.mkdirSync to create the directory
        vi.mocked(fs.mkdirSync).mockImplementation(() => tempRepoPath);

        // Mock git.clone to throw an error
        vi.mocked(git.clone).mockRejectedValue(new Error('Cloning failed'));

        await expect(cloneRepo(githubUrl)).rejects.toThrow('Cloning failed');
        expect(fs.existsSync).toHaveBeenCalledWith(tempRepoPath);
        expect(git.clone).toHaveBeenCalledWith({
        fs,
        http: expect.anything(),
        dir: tempRepoPath,
        url: 'https://github.com/user/repo',
        singleBranch: true,
        depth: 1,
        });
    });
});
