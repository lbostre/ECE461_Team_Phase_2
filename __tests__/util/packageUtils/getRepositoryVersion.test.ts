// Test getRepositoryVersion function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositoryVersion } from '../../../src/util/packageUtils';

// Mock fetch
global.fetch = vi.fn();

describe('getRepositoryVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the latest version from the GitHub tags', async () => {
    const url = 'https://github.com/user/repo';
    const tagsResponse = [
      { name: 'v1.2.3' },
      { name: 'v1.2.2' },
      { name: 'v1.2.1' },
    ];

    // Mock fetch to return a successful response
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn().mockResolvedValue(tagsResponse),
    } as unknown as Response);

    const result = await getRepositoryVersion(url);

    expect(result).toBe('1.2.3');
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/user/repo/tags');
  });

  it('should return "1.0.0" if no tags are found', async () => {
    const url = 'https://github.com/user/repo';
    const tagsResponse: any[] = [];

    // Mock fetch to return a successful response
    vi.mocked(fetch).mockResolvedValue({
      json: vi.fn().mockResolvedValue(tagsResponse),
    } as unknown as Response);

    const result = await getRepositoryVersion(url);

    expect(result).toBe('1.0.0');
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/user/repo/tags');
  });

  it('should return "1.0.0" if the GitHub URL is invalid', async () => {
    const url = 'https://github.com/user';

    await expect(getRepositoryVersion(url)).rejects.toThrow('Invalid GitHub URL.');
  });

  it('should return "1.0.0" if there is an error fetching the tags', async () => {
    const url = 'https://github.com/user/repo';

    // Mock fetch to throw an error
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const result = await getRepositoryVersion(url);

    expect(result).toBe('1.0.0');
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/user/repo/tags');
  });
});