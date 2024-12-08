// Test calculateScore function

import { calculateScore } from '../../src/metrics/calculateScore';
import { describe, it, expect } from 'vitest';

describe('calculateScore', () => {
  it('should calculate the correct score with all values equal', async () => {
    const score = await calculateScore(1, 1, 1, 1, 1, 1, 1);
    expect(score).toBeCloseTo(1, 3);
  });

  it('should calculate the correct score with different values', async () => {
    const score = await calculateScore(0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9);
    const expectedScore = (0.3 * 0.2 + 0.4 * 0.18 + 0.5 * 0.18 + 0.6 * 0.14 + 0.7 * 0.14 + 0.8 * 0.1 + 0.9 * 0.06) / (0.2 + 0.18 + 0.18 + 0.14 + 0.14 + 0.1 + 0.06);
    expect(score).toBeCloseTo(expectedScore, 3);
  });

  it('should calculate the correct score with zero values', async () => {
    const score = await calculateScore(0, 0, 0, 0, 0, 0, 0);
    expect(score).toBeCloseTo(0, 3);
  });

  it('should calculate the correct score with mixed values', async () => {
    const score = await calculateScore(1, 0, 1, 0, 1, 0, 1);
    const expectedScore = (1 * 0.2 + 0 * 0.18 + 1 * 0.18 + 0 * 0.14 + 1 * 0.14 + 0 * 0.1 + 1 * 0.06) / (0.2 + 0.18 + 0.18 + 0.14 + 0.14 + 0.1 + 0.06);
    expect(score).toBeCloseTo(expectedScore, 3);
  });

  it('should calculate the correct score with maximum and minimum values', async () => {
    const score = await calculateScore(1, 0, 1, 0, 1, 0, 1);
    const expectedScore = (1 * 0.2 + 0 * 0.18 + 1 * 0.18 + 0 * 0.14 + 1 * 0.14 + 0 * 0.1 + 1 * 0.06) / (0.2 + 0.18 + 0.18 + 0.14 + 0.14 + 0.1 + 0.06);
    expect(score).toBeCloseTo(expectedScore, 3);
  });
});