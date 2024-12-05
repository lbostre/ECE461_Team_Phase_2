// Test convertToApiUrl function

import { describe, it, expect } from 'vitest';
import { convertToApiUrl } from '../../../src/util/repoUtils';

describe('convertToApiUrl', () => {
  it('should convert a GitHub URL to an API URL', () => {
    const githubUrl = 'https://github.com/user/repo';
    const apiUrl = convertToApiUrl(githubUrl);
    expect(apiUrl).toBe('https://api.github.com/repos/user/repo');
  });

  it('should handle URLs with different protocols', () => {
    const githubUrl = 'http://github.com/user/repo';
    const apiUrl = convertToApiUrl(githubUrl);
    expect(apiUrl).toBe('http://api.github.com/repos/user/repo');
  });

  it('should handle URLs with subdomains', () => {
    const githubUrl = 'https://subdomain.github.com/user/repo';
    const apiUrl = convertToApiUrl(githubUrl);
    expect(apiUrl).toBe('https://subdomain.api.github.com/repos/user/repo');
  });

  it('should handle URLs with paths', () => {
    const githubUrl = 'https://github.com/user/repo/path';
    const apiUrl = convertToApiUrl(githubUrl);
    expect(apiUrl).toBe('https://api.github.com/repos/user/repo/path');
  });

  it('should handle URLs with query parameters', () => {
    const githubUrl = 'https://github.com/user/repo?param=value';
    const apiUrl = convertToApiUrl(githubUrl);
    expect(apiUrl).toBe('https://api.github.com/repos/user/repo?param=value');
  });

  it('should handle URLs with fragments', () => {
    const githubUrl = 'https://github.com/user/repo#fragment';
    const apiUrl = convertToApiUrl(githubUrl);
    expect(apiUrl).toBe('https://api.github.com/repos/user/repo#fragment');
  });
});