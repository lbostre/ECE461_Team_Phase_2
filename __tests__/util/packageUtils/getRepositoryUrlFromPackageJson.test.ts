// Test getRepositoryUrlFromPackageJson function

import { describe, it, expect } from 'vitest';
import { getRepositoryUrlFromPackageJson } from '../../../src/util/packageUtils';

describe('getRepositoryUrlFromPackageJson', () => {
  it('should return the GitHub URL for a repository string', () => {
    const packageJson = {
      repository: 'user/repo',
    };

    const result = getRepositoryUrlFromPackageJson(packageJson);

    expect(result).toBe('https://github.com/user/repo');
  });

  it('should return the GitHub URL for a repository object with "url" field', () => {
    const packageJson = {
      repository: {
        url: 'git+https://github.com/user/repo.git',
      },
    };

    const result = getRepositoryUrlFromPackageJson(packageJson);

    expect(result).toBe('https://github.com/user/repo');
  });

  it('should return null if repository is not present', () => {
    const packageJson = {};

    const result = getRepositoryUrlFromPackageJson(packageJson);

    expect(result).toBeNull();
  });

  it('should return null if repository URL is not in GitHub format', () => {
    const packageJson = {
      repository: {
        url: 'https://bitbucket.org/user/repo',
      },
    };

    const result = getRepositoryUrlFromPackageJson(packageJson);

    expect(result).toBeNull();
  });

  it('should handle repository URL without "git+" prefix', () => {
    const packageJson = {
      repository: {
        url: 'https://github.com/user/repo.git',
      },
    };

    const result = getRepositoryUrlFromPackageJson(packageJson);

    expect(result).toBe('https://github.com/user/repo');
  });

  it('should handle repository URL without ".git" suffix', () => {
    const packageJson = {
      repository: {
        url: 'git+https://github.com/user/repo',
      },
    };

    const result = getRepositoryUrlFromPackageJson(packageJson);

    expect(result).toBe('https://github.com/user/repo');
  });
});