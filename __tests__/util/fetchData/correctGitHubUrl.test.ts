// __tests__/util/fetchData/correctGitHubUrl.test.ts

import { describe, it, expect } from 'vitest';
import { correctGitHubUrl } from '../../../src/util/fetchData';

describe('correctGitHubUrl', () => {
  it('should return the correct API URL for a valid GitHub API URL', () => {
    const apiUrl = 'https://api.github.com/repos/user/repo';
    const endpoint = 'commits';
    const result = correctGitHubUrl(apiUrl, endpoint);
    expect(result).toBe('https://api.github.com/repos/user/repo/commits');
  });

  it('should convert a URL with a different protocol to the correct API URL', () => {
    const apiUrl = 'http://api.github.com/repos/user/repo';
    const endpoint = 'commits';
    const result = correctGitHubUrl(apiUrl, endpoint);
    expect(result).toBe('https://api.github.com/repos/user/repo/commits');
  });

  it('should convert a URL with a path to the correct API URL', () => {
    const apiUrl = 'https://api.github.com/repos/user/repo/path';
    const endpoint = 'commits';
    const result = correctGitHubUrl(apiUrl, endpoint);
    expect(result).toBe('https://api.github.com/repos/user/repo/commits');
  });

  it('should convert a URL with query parameters to the correct API URL', () => {
    const apiUrl = 'https://api.github.com/repos/user/repo?param=value';
    const endpoint = 'commits';
    const result = correctGitHubUrl(apiUrl, endpoint);
    expect(result).toBe('https://api.github.com/repos/user/repo/commits');
  });

  it('should convert a URL with a fragment to the correct API URL', () => {
    const apiUrl = 'https://api.github.com/repos/user/repo#fragment';
    const endpoint = 'commits';
    const result = correctGitHubUrl(apiUrl, endpoint);
    expect(result).toBe('https://api.github.com/repos/user/repo/commits');
  });

  it('should throw an error for an invalid GitHub API URL', () => {
    const apiUrl = 'https://api.github.com/repos/user';
    const endpoint = 'commits';
    expect(() => correctGitHubUrl(apiUrl, endpoint)).toThrow('Cannot extract owner and repo from URL: https://api.github.com/repos/user');
  });
});