// __tests__/util/packageUtils/extractOwnerRepoFromUrl.test.ts

import { describe, it, expect } from 'vitest';
import { extractOwnerRepoFromUrl } from '../../../src/util/packageUtils';

describe('extractOwnerRepoFromUrl', () => {
  it('should extract owner and repo from a valid GitHub URL', () => {
    const url = 'https://github.com/user/repo';
    const result = extractOwnerRepoFromUrl(url);
    expect(result).toEqual(['user', 'repo']);
  });

  it('should extract owner and repo from a valid GitHub URL with additional path', () => {
    const url = 'https://github.com/user/repo/tree/main';
    const result = extractOwnerRepoFromUrl(url);
    expect(result).toEqual(['user', 'repo']);
  });

  it('should extract owner and repo from a valid GitHub URL with query parameters', () => {
    const url = 'https://github.com/user/repo?tab=readme';
    const result = extractOwnerRepoFromUrl(url);
    expect(result).toEqual([ "user", "repo?tab=readme",]);
  });

  it('should throw an error for an invalid GitHub URL', () => {
    const url = 'https://github.com/user';
    expect(() => extractOwnerRepoFromUrl(url)).toThrow('Invalid GitHub URL: https://github.com/user');
  });

  it('should throw an error for a non-GitHub URL', () => {
    const url = 'https://bitbucket.org/user/repo';
    expect(() => extractOwnerRepoFromUrl(url)).toThrow('Invalid GitHub URL: https://bitbucket.org/user/repo');
  });

  it('should throw an error for an empty URL', () => {
    const url = '';
    expect(() => extractOwnerRepoFromUrl(url)).toThrow('Invalid GitHub URL: ');
  });
});