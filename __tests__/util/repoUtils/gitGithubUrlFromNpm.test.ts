// Test getGithubUrlFromNpm function

import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { getGithubUrlFromNpm } from '../../../src/util/repoUtils';

vi.mock('axios');

describe('getGithubUrlFromNpm', () => {
  it('should return the GitHub URL for a valid npm package URL', async () => {
    const npmUrl = 'https://www.npmjs.com/package/express';
    const githubUrl = 'https://github.com/expressjs/express';

    // Mock the axios.get response
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        repository: {
          url: 'git+https://github.com/expressjs/express.git',
        },
      },
    });

    const result = await getGithubUrlFromNpm(npmUrl);
    expect(result).toBe(githubUrl);
  });

  it('should return null if the npm package does not have a repository URL', async () => {
    const npmUrl = 'https://www.npmjs.com/package/unknown-package';

    // Mock the axios.get response
    vi.mocked(axios.get).mockResolvedValue({
      data: {},
    });

    const result = await getGithubUrlFromNpm(npmUrl);
    expect(result).toBeNull();
  });

  it('should throw an error for an invalid npm package URL', async () => {
    const invalidNpmUrl = 'https://www.npmjs.com/package/';

    await expect(getGithubUrlFromNpm(invalidNpmUrl)).rejects.toThrow('Invalid npm package URL');
  });

  it('should handle errors from the axios.get call', async () => {
    const npmUrl = 'https://www.npmjs.com/package/express';

    // Mock the axios.get response to throw an error
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

    await expect(getGithubUrlFromNpm(npmUrl)).rejects.toThrow('Network error');
  });
});