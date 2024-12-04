// Test rampUpTime function

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { rampUpTime } from '../../src/metrics/rampUpTime';

describe('rampUpTime', () => {
  it('should throw an error if readme is null', async () => {
    await expect(rampUpTime(null)).rejects.toThrow('Readme file not found');
  });

  it('should return 0 if readme does not contain any headings', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue('No relevant headings here.');
    const result = await rampUpTime('dummy/path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(0);
    expect(result.rampUpTimeEnd).toBeLessThanOrEqual(Date.now());
    readFileSpy.mockRestore();
  });

  it('should return 1 if readme contains all headings', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(`
      # Installation
      # Usage
      # Configuration
      # FAQ
      # Resources
    `);
    const result = await rampUpTime('dummy/path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(1);
    expect(result.rampUpTimeEnd).toBeLessThanOrEqual(Date.now());
    readFileSpy.mockRestore();
  });

  it('should return correct value if readme contains some headings', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(`
      # Installation
      # Usage
    `);
    const result = await rampUpTime('dummy/path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(2 / 5);
    expect(result.rampUpTimeEnd).toBeLessThanOrEqual(Date.now());
    readFileSpy.mockRestore();
  });

  it('should handle case insensitive headings', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(`
      # installation
      # usage
      # configuration
      # faq
      # resources
    `);
    const result = await rampUpTime('dummy/path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(1);
    expect(result.rampUpTimeEnd).toBeLessThanOrEqual(Date.now());
    readFileSpy.mockRestore();
  });
});