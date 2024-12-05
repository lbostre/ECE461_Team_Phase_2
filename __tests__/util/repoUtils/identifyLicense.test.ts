// Test identifyLicense function

import { describe, it, expect } from 'vitest';
import { identifyLicense } from '../../../src/util/repoUtils';

describe('identifyLicense', () => {
  it('should identify MIT license', () => {
    const content = 'MIT License';
    const result = identifyLicense(content);
    expect(result).toBe('MIT');
  });

  it('should identify Apache 2.0 license', () => {
    const content = 'Apache License, Version 2.0';
    const result = identifyLicense(content);
    expect(result).toBe('Apache 2.0');
  });

  it('should identify GPL v2.0 license', () => {
    const content = 'GNU General Public License, Version 2';
    const result = identifyLicense(content);
    expect(result).toBe('GPL v2.0');
  });

  it('should identify GPL v3.0 license', () => {
    const content = 'GNU General Public License, Version 3';
    const result = identifyLicense(content);
    expect(result).toBe('GPL v3.0');
  });

  it('should identify LGPL v2.1 license', () => {
    const content = 'GNU Lesser General Public License, Version 2.1';
    const result = identifyLicense(content);
    expect(result).toBe('LGPL v2.1');
  });

  it('should identify LGPL v3.0 license', () => {
    const content = 'GNU Lesser General Public License, Version 3';
    const result = identifyLicense(content);
    expect(result).toBe('LGPL v3.0');
  });

  it('should identify BSD 2-Clause license', () => {
    const content = 'BSD 2-Clause "Simplified" License';
    const result = identifyLicense(content);
    expect(result).toBe('BSD 2-Clause');
  });

  it('should identify BSD 3-Clause license', () => {
    const content = 'BSD 3-Clause "New" or "Revised" License';
    const result = identifyLicense(content);
    expect(result).toBe('BSD 3-Clause');
  });

  it('should identify MPL 2.0 license', () => {
    const content = 'Mozilla Public License, Version 2.0';
    const result = identifyLicense(content);
    expect(result).toBe('MPL 2.0');
  });

  it('should identify CDDL 1.0 license', () => {
    const content = 'Common Development and Distribution License, Version 1.0';
    const result = identifyLicense(content);
    expect(result).toBe('CDDL 1.0');
  });

  it('should identify EPL 2.0 license', () => {
    const content = 'Eclipse Public License, Version 2.0';
    const result = identifyLicense(content);
    expect(result).toBe('EPL 2.0');
  });

  it('should return null for unknown license', () => {
    const content = 'Unknown License';
    const result = identifyLicense(content);
    expect(result).toBeNull();
  });
});