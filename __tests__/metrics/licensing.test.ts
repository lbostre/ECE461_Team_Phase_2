// Test licensing function

import { licensing } from '../../src/metrics/licensing';
import { describe, it, expect } from 'vitest';

describe('licensing', () => {
    it('should return 1 for a valid license', async () => {
        const result = await licensing('MIT');
        expect(result.licenseCompatabilityValue).toBe(1);
        expect(result.licenseEnd).toBeLessThanOrEqual(Date.now());
    });

    it('should return 0 for a null license', async () => {
        const result = await licensing(null);
        expect(result.licenseCompatabilityValue).toBe(0);
        expect(result.licenseEnd).toBeLessThanOrEqual(Date.now());
    });

    it('should return 1 for a non-null license', async () => {
        const result = await licensing('Apache-2.0');
        expect(result.licenseCompatabilityValue).toBe(1);
        expect(result.licenseEnd).toBeLessThanOrEqual(Date.now());
    });

    it('should return 0 for an empty string license', async () => {
        const result = await licensing('');
        expect(result.licenseCompatabilityValue).toBe(0);
        expect(result.licenseEnd).toBeLessThanOrEqual(Date.now());
    });
});