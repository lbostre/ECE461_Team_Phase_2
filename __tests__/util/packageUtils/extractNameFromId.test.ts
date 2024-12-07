// Test extractNameFromId function

import { describe, it, expect } from 'vitest';
import { extractNameFromId } from '../../../src/util/packageUtils';

describe('extractNameFromId', () => {
  it('should extract the name from an ID with numbers', () => {
    const id = 'examplePackage123';
    const result = extractNameFromId(id);
    expect(result).toBe('examplePackage');
  });

  it('should return the same name if there are no numbers in the ID', () => {
    const id = 'examplePackage';
    const result = extractNameFromId(id);
    expect(result).toBe('examplePackage');
  });

  it('should return an empty string if the ID contains only numbers', () => {
    const id = '123456';
    const result = extractNameFromId(id);
    expect(result).toBe('');
  });

  it('should return an empty string if the ID is empty', () => {
    const id = '';
    const result = extractNameFromId(id);
    expect(result).toBe('');
  });

  it('should extract the name from an ID with special characters and numbers', () => {
    const id = 'example-Package_123';
    const result = extractNameFromId(id);
    expect(result).toBe('example-Package_');
  });
});