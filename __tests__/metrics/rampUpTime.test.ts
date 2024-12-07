// __tests__/metrics/rampUpTime.test.ts

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { rampUpTime } from '../../src/metrics/rampUpTime';

describe('rampUpTime', () => {
  it('should throw an error if readme is null', async () => {
    await expect(rampUpTime(null)).rejects.toThrow('Readme file not found');
  });

  it('should return 0 if readme does not contain any headings', async () => {
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue('No relevant headings here.');
    const result = await rampUpTime('path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(0);
    expect(result.rampUpTimeLatency).toBeGreaterThanOrEqual(0);
    readFileSpy.mockRestore();
  });

  it('should return 1 if readme contains all headings', async () => {
    const readmeContent = `
      # Installation
      ## Usage
      ### Configuration
      #### FAQ
      ##### Resources
    `;
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(readmeContent);
    const result = await rampUpTime('path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(1);
    expect(result.rampUpTimeLatency).toBeGreaterThanOrEqual(0);
    readFileSpy.mockRestore();
  });

  it('should return correct value if readme contains some headings', async () => {
    const readmeContent = `
      # Installation
      ## Usage
    `;
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(readmeContent);
    const result = await rampUpTime('path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(0.4); // 2 out of 5 headings
    expect(result.rampUpTimeLatency).toBeGreaterThanOrEqual(0);
    readFileSpy.mockRestore();
  });

  it('should handle case-insensitive headings', async () => {
    const readmeContent = `
      # installation
      ## UsAgE
      ### CONFIGURATION
      #### faq
      ##### resources
    `;
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(readmeContent);
    const result = await rampUpTime('path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(1);
    expect(result.rampUpTimeLatency).toBeGreaterThanOrEqual(0);
    readFileSpy.mockRestore();
  });

  it('should handle headings in different formats', async () => {
    const readmeContent = `
      ## Getting Started
      Learn how to install and configure the application.

      ## Help
      Visit the FAQ section for more information.
    `;
    const readFileSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(readmeContent);
    const result = await rampUpTime('path/to/readme.md');
    expect(result.rampUpTimeValue).toBe(0.2); // Matches 'installation' and 'faq/help'
    expect(result.rampUpTimeLatency).toBeGreaterThanOrEqual(0);
    readFileSpy.mockRestore();
  });
});