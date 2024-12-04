// Test responsiveness function

import { responsiveness } from '../../src/metrics/responsiveness';
import { describe, it, expect } from 'vitest';


describe('responsiveness', () => {
  it('should return responsiveness value of 1 when there are no issue durations', async () => {
    const result = await responsiveness([]);
    expect(result.responsivenessValue).toBe(1);
  });

  it('should return responsiveness value of 1 when all issue durations are zero', async () => {
    const result = await responsiveness([0, 0, 0]);
    expect(result.responsivenessValue).toBe(1);
  });

  it('should return responsiveness value of 0.5 when average issue duration is half a year', async () => {
    const result = await responsiveness([182.5, 182.5, 182.5]);
    expect(result.responsivenessValue).toBeCloseTo(0.5, 3);
  });

  it('should return responsiveness value of 0 when average issue duration is one year', async () => {
    const result = await responsiveness([365, 365, 365]);
    expect(result.responsivenessValue).toBe(0);
  });

  it('should return responsiveness value of 0 when average issue duration is more than one year', async () => {
    const result = await responsiveness([400, 400, 400]);
    expect(result.responsivenessValue).toBe(0);
  });

  it('should return correct responsiveness value for mixed issue durations', async () => {
    const result = await responsiveness([30, 60, 90, 120, 150]);
    const expectedValue = 1 - ((30 + 60 + 90 + 120 + 150) / 5 / 365);
    expect(result.responsivenessValue).toBeCloseTo(expectedValue, 3);
  });
});