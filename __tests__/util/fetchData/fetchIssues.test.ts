// __tests__/util/fetchData/fetchIssues.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { fetchIssues } from '../../../src/util/fetchData';

// Mock axios
vi.mock('axios');

describe('fetchIssues', () => {
  const issuesUrl = 'https://api.github.com/repos/user/repo/issues';
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: 'token test-token',
  };

  const mockIssuesPage1 = [
    { created_at: '2022-01-01T00:00:00Z', closed_at: '2022-01-02T00:00:00Z' },
    { created_at: '2022-01-03T00:00:00Z', closed_at: '2022-01-04T00:00:00Z' },
    { created_at: '2022-01-05T00:00:00Z', closed_at: null },
  ];

  const mockIssuesPage2 = [
    { created_at: '2022-01-06T00:00:00Z', closed_at: '2022-01-07T00:00:00Z' },
    { created_at: '2022-01-08T00:00:00Z', closed_at: null },
  ];

  const mockEmptyPage = [];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch issues and return open and closed issues with durations', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: mockIssuesPage1 })
      .mockResolvedValueOnce({ data: mockIssuesPage2 })
      .mockResolvedValueOnce({ data: mockEmptyPage });

    const result = await fetchIssues(issuesUrl, headers);

    expect(result).toEqual({
      openIssues: 2,
      closedIssues: 3,
      issueDurations: [1, 1, 1],
    });

    expect(axios.get).toHaveBeenCalledWith(`${issuesUrl}?page=1&per_page=100&state=all`, { headers });
    expect(axios.get).toHaveBeenCalledWith(`${issuesUrl}?page=2&per_page=100&state=all`, { headers });
    expect(axios.get).toHaveBeenCalledWith(`${issuesUrl}?page=3&per_page=100&state=all`, { headers });
  });

  it('should return zero open and closed issues if no issues are found', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockEmptyPage });

    const result = await fetchIssues(issuesUrl, headers);

    expect(result).toEqual({
      openIssues: 0,
      closedIssues: 0,
      issueDurations: [],
    });

    expect(axios.get).toHaveBeenCalledWith(`${issuesUrl}?page=1&per_page=100&state=all`, { headers });
  });

  it('should throw an error if the network request fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

    await expect(fetchIssues(issuesUrl, headers)).rejects.toThrow('Network error');

    expect(axios.get).toHaveBeenCalledWith(`${issuesUrl}?page=1&per_page=100&state=all`, { headers });
  });
});