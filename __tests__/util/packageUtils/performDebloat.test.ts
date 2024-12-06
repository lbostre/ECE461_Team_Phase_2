// Test performDebloat function

import { describe, it, expect, vi } from 'vitest';
import { minify } from 'terser';
import { performDebloat } from '../../../src/util/packageUtils';

vi.mock('terser');

describe('performDebloat', () => {
  it('should minify the content and return the minified code', async () => {
    const content = 'function add(a, b) { return a + b; }';
    const minifiedContent = 'function add(a,b){return a+b}';

    // Mock minify to return a successful response
    vi.mocked(minify).mockResolvedValue({ code: minifiedContent });

    const result = await performDebloat(content);

    expect(result).toBe(minifiedContent);
    expect(minify).toHaveBeenCalledWith(content);
  });

  it('should return the original content if minification fails', async () => {
    const content = 'function add(a, b) { return a + b; }';

    // Mock minify to throw an error
    vi.mocked(minify).mockRejectedValue(new Error('Minification failed'));

    const result = await performDebloat(content);

    expect(result).toBe(content);
    expect(minify).toHaveBeenCalledWith(content);
  });
});