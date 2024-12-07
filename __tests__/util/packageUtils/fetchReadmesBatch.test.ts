// __tests__/util/packageUtils/fetchReadmesBatch.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { fetchReadmesBatch } from '../../../src/util/packageUtils';

// Mock the axios module
vi.mock('axios');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchReadmesBatch', () => {
  const githubUrls = [
    'https://github.com/user/repo1',
    'https://github.com/user/repo2',
  ];

  const mockResponse = {
    data: {
      data: {
        repo0: {
          object: {
            text: 'README content for repo1',
          },
        },
        repo1: {
          object: {
            text: 'README content for repo2',
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch README files successfully', async () => {
    vi.mocked(axios.post).mockResolvedValue(mockResponse);

    const result = await fetchReadmesBatch(githubUrls);

    expect(result).toEqual({
      'https://github.com/user/repo1': 'README content for repo1',
      'https://github.com/user/repo2': 'README content for repo2',
    });

    expect(axios.post).toHaveBeenCalled();
  });

  it('should handle invalid URLs gracefully', async () => {
    const invalidUrls = ['invalid-url'];

    await expect(fetchReadmesBatch(invalidUrls)).rejects.toThrow('Invalid GitHub URL: invalid-url');

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should handle errors from the GitHub API gracefully', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('GitHub API error'));

    await expect(fetchReadmesBatch(githubUrls)).rejects.toThrow('GitHub API error');

    expect(axios.post).toHaveBeenCalled();
  });

  it('should throw an error if response.data.errors is present', async () => {
    const mockErrorResponse = {
      data: {
        errors: ['Some error occurred'],
      },
    };

    vi.mocked(axios.post).mockResolvedValue(mockErrorResponse);

    await expect(fetchReadmesBatch(githubUrls)).rejects.toThrow('Failed to fetch README files.');

    expect(axios.post).toHaveBeenCalled();
  });
});