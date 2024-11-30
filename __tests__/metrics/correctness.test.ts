// Test correctness function

import { correctness } from '../../src/metrics/correctness';
import { describe, it, expect } from 'vitest';


describe('correctness', () => {
	it('should return correctness value of 1 when there are no open issues', async () => {
		const result = await correctness(0, 10);
		expect(result.correctnessValue).toBe(1);
	});

	it('should return correctness value of 0 when there are no closed issues', async () => {
		const result = await correctness(10, 0);
		expect(result.correctnessValue).toBe(0);
	});

	it('should return correctness value of 0.5 when open issues and closed issues are equal', async () => {
		const result = await correctness(5, 5);
		expect(result.correctnessValue).toBe(0.5);
	});

	it('should return correctness value of 0.75 when there are more closed issues than open issues', async () => {
		const result = await correctness(2, 6);
		expect(result.correctnessValue).toBe(0.75);
	});

	it('should return correctness value of 0.25 when there are more open issues than closed issues', async () => {
		const result = await correctness(6, 2);
		expect(result.correctnessValue).toBe(0.25);
	});

	it('should return correctness value of 0 when both open and closed issues are zero', async () => {
		const result = await correctness(0, 0);
		expect(result.correctnessValue).toBe(0);
	});
});