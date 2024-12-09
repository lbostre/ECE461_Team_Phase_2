// __tests__/util/repoUtils/codeReviewCoverage.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { codeReviewCoverage } from '../../../src/util/repoUtils';

vi.mock('axios');

describe('codeReviewCoverage', () => {
  const repoURL = 'https://api.github.com/repos/test-owner/test-repo';
  const headers = { Authorization: 'token test-token' };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 1.0 when there are no pull requests', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: [] });

    const result = await codeReviewCoverage(repoURL, headers);

    expect(axios.get).toHaveBeenCalledWith(`${repoURL}/pulls?state=closed&per_page=100`, { headers });
    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should return 1.0 when there are pull requests but none are merged', async () => {
    const pullRequests = [
      { number: 1, merged_at: null, requested_reviewers: [{ login: 'reviewer1' }] },
      { number: 2, merged_at: null, requested_reviewers: [{ login: 'reviewer2' }] },
    ];
    vi.mocked(axios.get).mockResolvedValueOnce({ data: pullRequests });

    const result = await codeReviewCoverage(repoURL, headers);

    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should return 1.0 when merged pull requests have no reviewers', async () => {
    const pullRequests = [
      { number: 1, merged_at: '2022-01-01T00:00:00Z', requested_reviewers: [] },
      { number: 2, merged_at: '2022-01-02T00:00:00Z', requested_reviewers: [] },
    ];
    vi.mocked(axios.get).mockResolvedValueOnce({ data: pullRequests });

    const result = await codeReviewCoverage(repoURL, headers);

    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should calculate correct coverage when there are merged pull requests with reviewers', async () => {
    const pullRequests = [
      {
        number: 1,
        merged_at: '2022-01-01T00:00:00Z',
        requested_reviewers: [{ login: 'reviewer1' }],
      },
      {
        number: 2,
        merged_at: '2022-01-02T00:00:00Z',
        requested_reviewers: [{ login: 'reviewer2' }],
      },
    ];

    const pr1Files = [
      { filename: 'file1.js', changes: 10 },
      { filename: 'file2.js', changes: 5 },
    ];

    const pr2Files = [
      { filename: 'file3.js', changes: 20 },
      { filename: 'file4.js', changes: 15 },
    ];

    vi.mocked(axios.get)
      // Mock pull requests response
      .mockResolvedValueOnce({ data: pullRequests })
      // Mock PR #1 files response
      .mockResolvedValueOnce({ data: pr1Files })
      // Mock PR #2 files response
      .mockResolvedValueOnce({ data: pr2Files });

    const result = await codeReviewCoverage(repoURL, headers);

    // Total LOC = 10 + 5 + 20 + 15 = 50
    // Reviewed LOC = 50 (since all merged PRs have reviewers)
    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);

    expect(axios.get).toHaveBeenCalledWith(`${repoURL}/pulls?state=closed&per_page=100`, { headers });
    expect(axios.get).toHaveBeenCalledWith(`${repoURL}/pulls/1/files`, { headers });
    expect(axios.get).toHaveBeenCalledWith(`${repoURL}/pulls/2/files`, { headers });
  });

  it('should calculate correct coverage when some merged pull requests have reviewers', async () => {
    const pullRequests = [
      {
        number: 1,
        merged_at: '2022-01-01T00:00:00Z',
        requested_reviewers: [{ login: 'reviewer1' }],
      },
      {
        number: 2,
        merged_at: '2022-01-02T00:00:00Z',
        requested_reviewers: [],
      },
    ];

    const pr1Files = [
      { filename: 'file1.js', changes: 10 },
      { filename: 'file2.js', changes: 5 },
    ];

    const pr2Files = [
      { filename: 'file3.js', changes: 20 },
      { filename: 'file4.js', changes: 15 },
    ];

    vi.mocked(axios.get)
      // Mock pull requests response
      .mockResolvedValueOnce({ data: pullRequests })
      // Mock PR #1 files response
      .mockResolvedValueOnce({ data: pr1Files })
      // Mock PR #2 files response
      .mockResolvedValueOnce({ data: pr2Files });

    const result = await codeReviewCoverage(repoURL, headers);

    // Total LOC = (10 + 5) + (20 + 15) = 50
    // Reviewed LOC = (10 + 5) = 15
    expect(result.value).toBe(15 / 50);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors when fetching pull requests', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await codeReviewCoverage(repoURL, headers);

    expect(result.value).toBe(0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
    expect(axios.get).toHaveBeenCalledWith(`${repoURL}/pulls?state=closed&per_page=100`, { headers });
  });

  it('should handle errors when fetching PR files', async () => {
    const pullRequests = [
      {
        number: 1,
        merged_at: '2022-01-01T00:00:00Z',
        requested_reviewers: [{ login: 'reviewer1' }],
      },
    ];

    vi.mocked(axios.get)
      // Mock pull requests response
      .mockResolvedValueOnce({ data: pullRequests })
      // Mock PR files response with error
      .mockRejectedValueOnce(new Error('API rate limit exceeded'));

    const result = await codeReviewCoverage(repoURL, headers);

    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
    expect(axios.get).toHaveBeenCalledWith(`${repoURL}/pulls/1/files`, { headers });
  });
});