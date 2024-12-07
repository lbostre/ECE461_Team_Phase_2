// __tests__/metrics/licensing.test.ts

import { describe, it, expect } from 'vitest';
import { licensing } from '../../src/metrics/licensing';

describe('licensing', () => {
  it('should return 1 for a valid license', async () => {
    const result = await licensing('MIT');
    expect(result.licenseCompatabilityValue).toBe(1);
    expect(result.licenseLatency).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 for a null license', async () => {
    const result = await licensing(null);
    expect(result.licenseCompatabilityValue).toBe(0);
    expect(result.licenseLatency).toBeGreaterThanOrEqual(0);
  });

  it('should return 1 for a non-null license', async () => {
    const result = await licensing('Apache-2.0');
    expect(result.licenseCompatabilityValue).toBe(1);
    expect(result.licenseLatency).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 for an empty string license', async () => {
    const result = await licensing('');
    expect(result.licenseCompatabilityValue).toBe(0);
    expect(result.licenseLatency).toBeGreaterThanOrEqual(0);
  });
});