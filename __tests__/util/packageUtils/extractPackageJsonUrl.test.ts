// Test extractPackageJsonUrl function

import { describe, it, expect, vi } from 'vitest';
import AdmZip from 'adm-zip';
import { extractPackageJsonUrl } from '../../../src/util/packageUtils';

vi.mock('adm-zip');

describe('extractPackageJsonUrl', () => {
  it('should return the repository URL from package.json', async () => {
    const contentBase64 = Buffer.from(JSON.stringify({
      repository: {
        url: 'https://github.com/user/repo.git',
      },
    })).toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockReturnValue({
        getData: vi.fn().mockReturnValue(Buffer.from(JSON.stringify({
          repository: {
            url: 'https://github.com/user/repo.git',
          },
        }))),
      }),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    const result = await extractPackageJsonUrl(contentBase64);

    expect(result).toBe('https://github.com/user/repo');
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });

  it('should return null if package.json is not found', async () => {
    const contentBase64 = Buffer.from('').toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockReturnValue(null),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    const result = await extractPackageJsonUrl(contentBase64);

    expect(result).toBeNull();
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });

  it('should return null if repository URL is not found in package.json', async () => {
    const contentBase64 = Buffer.from(JSON.stringify({})).toString('base64');

    const zipMock = {
      getEntry: vi.fn().mockReturnValue({
        getData: vi.fn().mockReturnValue(Buffer.from(JSON.stringify({}))),
      }),
    };

    vi.mocked(AdmZip).mockImplementation(() => zipMock as unknown as AdmZip);

    const result = await extractPackageJsonUrl(contentBase64);

    expect(result).toBeNull();
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

    await expect(extractPackageJsonUrl(contentBase64)).rejects.toThrow('Extraction failed');
    expect(zipMock.getEntry).toHaveBeenCalledWith('package.json');
  });
});