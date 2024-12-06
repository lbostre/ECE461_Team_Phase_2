// __tests__/util/fetchData/fetchCommits.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { fetchCommits } from '../../../src/util/fetchData';

// Mock axios
vi.mock('axios');

describe('fetchCommits', () => {
  const commitsUrl = 'https://api.github.com/repos/user/repo/commits';
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: 'token test-token',
  };

  const mockCommitsPage1 = [
    { author: { login: 'user1' } },
    { author: { login: 'user2' } },
    { author: { login: 'user1' } },
  ];

  const mockCommitsPage2 = [
    { author: { login: 'user3' } },
    { author: { login: 'user2' } },
  ];

  const mockEmptyPage = [];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch commits and return unique contributors', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: mockCommitsPage1 })
      .mockResolvedValueOnce({ data: mockCommitsPage2 })
      .mockResolvedValueOnce({ data: mockEmptyPage });

    const result = await fetchCommits(commitsUrl, headers);

    expect(result).toEqual([
      ['user1', 2],
      ['user2', 2],
      ['user3', 1],
    ]);

    expect(axios.get).toHaveBeenCalledWith(`${commitsUrl}?page=1&per_page=100`, { headers });
    expect(axios.get).toHaveBeenCalledWith(`${commitsUrl}?page=2&per_page=100`, { headers });
    expect(axios.get).toHaveBeenCalledWith(`${commitsUrl}?page=3&per_page=100`, { headers });
  });

  it('should return an empty array if no commits are found', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEmptyPage });

    const result = await fetchCommits(commitsUrl, headers);

    expect(result).toEqual([]);

    expect(axios.get).toHaveBeenCalledWith(`${commitsUrl}?page=1&per_page=100`, { headers });
  });

  it('should throw an error if the network request fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

    await expect(fetchCommits(commitsUrl, headers)).rejects.toThrow('Network error');

    expect(axios.get).toHaveBeenCalledWith(`${commitsUrl}?page=1&per_page=100`, { headers });
  });
});