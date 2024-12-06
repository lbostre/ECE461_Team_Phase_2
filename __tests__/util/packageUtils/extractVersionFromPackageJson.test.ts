// Test extractVersionFromPackageJson function

import { describe, it, expect, vi } from 'vitest';
import AdmZip from 'adm-zip';
import { extractVersionFromPackageJson } from '../../../src/util/packageUtils';

vi.mock('adm-zip');

describe('extractVersionFromPackageJson', () => {
  it('should return the version from package.json', async () => {
    const contentBase64 = Buffer.from(JSON.stringify({
      version: '1.2.3',
    })).toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockReturnValue({
        getData: vi.fn().mockReturnValue(Buffer.from(JSON.stringify({
          version: '1.2.3',
        }))),
      }),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    const result = await extractVersionFromPackageJson(contentBase64);

    expect(result).toBe('1.2.3');
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });

  it('should return "1.0.0" if package.json is not found', async () => {
    const contentBase64 = Buffer.from('').toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockReturnValue(null),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    const result = await extractVersionFromPackageJson(contentBase64);

    expect(result).toBe('1.0.0');
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });

  it('should return "1.0.0" if version is not found in package.json', async () => {
    const contentBase64 = Buffer.from(JSON.stringify({})).toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockReturnValue({
        getData: vi.fn().mockReturnValue(Buffer.from(JSON.stringify({}))),
      }),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    const result = await extractVersionFromPackageJson(contentBase64);

    expect(result).toBe('1.0.0');
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });

  it('should handle errors during extraction', async () => {
    const contentBase64 = Buffer.from('').toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockImplementation(() => {
        throw new Error('Extraction failed');
      }),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    await expect(extractVersionFromPackageJson(contentBase64)).rejects.toThrow('Extraction failed');
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });
});