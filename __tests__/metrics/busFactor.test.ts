// Test busFactor function

import { busFactor } from '../../src/metrics/busFactor';
import { describe, it, expect } from 'vitest';

describe('busFactor', () => {
  it('should return 0 bus factor value for an empty array', async () => {
    const result = await busFactor([]);
    expect(result.busFactorValue).toBe(0);
  });

  it('should return 1 bus factor value for a single contributor', async () => {
    const result = await busFactor([[1, 10]]);
    expect(result.busFactorValue).toBe(1);
  });

  it('should calculate the correct bus factor value for multiple contributors', async () => {
    const result = await busFactor([[1, 50], [2, 30], [3, 20]]);
    expect(result.busFactorValue).toBeCloseTo(0.666, 3);
  });

  it('should handle contributors with zero commits', async () => {
    const result = await busFactor([[1, 0], [2, 0], [3, 100]]);
    expect(result.busFactorValue).toBeCloseTo(0.333, 3);
  });
});