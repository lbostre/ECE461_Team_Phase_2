// Test fetchCostWithGraphQL function

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { fetchCostWithGraphQL } from '../../../src/util/packageUtils';

// Mock axios
vi.mock('axios');

describe('fetchCostWithGraphQL', () => {
  const owner = 'test-owner';
  const repo = 'test-repo';
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const packageJsonUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`;

  const mockDependencies = {
    'dependency-one': '^1.0.0',
    'dependency-two': '~2.0.0',
  };

  const mockPackageJson = {
    dependencies: mockDependencies,
  };

  const mockGraphQLResponse = {
    data: {
      data: {
        repository: {
          diskUsage: 102400, // in KB (100 MB)
          dependencyGraphManifests: {
            nodes: [
              {
                dependencies: {
                  nodes: [
                    {
                      packageName: 'dependency-one',
                      requirements: '^1.0.0',
                      repository: {
                        nameWithOwner: 'owner/dependency-one',
                        diskUsage: 51200, // 50 MB
                      },
                    },
                    // Additional dependencies if needed
                  ],
                },
              },
            ],
          },
        },
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch cost with dependencies successfully', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPackageJson });
    vi.mocked(axios.post).mockResolvedValueOnce(mockGraphQLResponse);

    const result = await fetchCostWithGraphQL(repoUrl, true);

    expect(result).toEqual({
      standaloneCost: 100,
      totalCost: 150,
      dependencies: {
        'dependency-one100': {
          standaloneCost: 50,
          totalCost: 50,
        },
      },
    });

    expect(axios.get).toHaveBeenCalledWith(packageJsonUrl);
    expect(axios.post).toHaveBeenCalled();
  });

  it('should fetch cost without dependencies successfully', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPackageJson });
    vi.mocked(axios.post).mockResolvedValueOnce(mockGraphQLResponse);

    const result = await fetchCostWithGraphQL(repoUrl, false);

    expect(result).toEqual({
      standaloneCost: 100,
      totalCost: 100,
      dependencies: {},
    });

    expect(axios.get).toHaveBeenCalledWith(packageJsonUrl);
    expect(axios.post).toHaveBeenCalled();
  });

  it('should throw an error for invalid GitHub repository URL', async () => {
    const invalidRepoUrl = 'https://invalid-url.com/repo';

    await expect(fetchCostWithGraphQL(invalidRepoUrl, true)).rejects.toThrow(
      'Invalid GitHub repository URL.'
    );

    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should handle missing package.json gracefully', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({
      response: { status: 404 },
    });

    await expect(fetchCostWithGraphQL(repoUrl, true)).rejects.toThrow();

    expect(axios.get).toHaveBeenCalledWith(packageJsonUrl);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should handle GraphQL API errors gracefully', async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPackageJson });
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('GraphQL API Error'));

    await expect(fetchCostWithGraphQL(repoUrl, true)).rejects.toThrow(
      'GraphQL API Error'
    );

    expect(axios.get).toHaveBeenCalledWith(packageJsonUrl);
    expect(axios.post).toHaveBeenCalled();
  });

  it('should throw an error if repoData is missing in the GraphQL response', async () => {
    const mockErrorResponse = {
      data: {
        data: {
          repository: null,
        },
      },
    };

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockPackageJson });
    vi.mocked(axios.post).mockResolvedValueOnce(mockErrorResponse);

    await expect(fetchCostWithGraphQL(repoUrl, true)).rejects.toThrow(
      'Repository data is missing in GraphQL response.'
    );

    expect(axios.get).toHaveBeenCalledWith(packageJsonUrl);
    expect(axios.post).toHaveBeenCalled();
  });
});