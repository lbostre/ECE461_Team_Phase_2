// __tests__/util/packageUtils/splitIntoChunks.test.ts

import { describe, it, expect } from 'vitest';
import { splitIntoChunks } from '../../../src/util/packageUtils';

describe('splitIntoChunks', () => {
  it('should split an array into chunks of size 2', () => {
    const arr = [1, 2, 3, 4, 5];
    const chunkSize = 2;
    const result = splitIntoChunks(arr, chunkSize);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should split an array into chunks of size 3', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const chunkSize = 3;
    const result = splitIntoChunks(arr, chunkSize);
    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('should handle an empty array', () => {
    const arr: number[] = [];
    const chunkSize = 3;
    const result = splitIntoChunks(arr, chunkSize);
    expect(result).toEqual([]);
  });

  it('should handle an array with fewer elements than the chunk size', () => {
    const arr = [1, 2];
    const chunkSize = 3;
    const result = splitIntoChunks(arr, chunkSize);
    expect(result).toEqual([[1, 2]]);
  });

  it('should handle a chunk size of 1', () => {
    const arr = [1, 2, 3];
    const chunkSize = 1;
    const result = splitIntoChunks(arr, chunkSize);
    expect(result).toEqual([[1], [2], [3]]);
  });

  it('should handle a chunk size greater than the array length', () => {
    const arr = [1, 2, 3];
    const chunkSize = 5;
    const result = splitIntoChunks(arr, chunkSize);
    expect(result).toEqual([[1, 2, 3]]);
  });
});