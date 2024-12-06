// Test createPackageService function

import { describe, it, expect } from 'vitest';
import { createPackageService } from '../../../src/util/packageUtils';
import { PackageData } from '../../../types';

describe('createPackageService', () => {
  it('should create a package with the correct metadata and data', async () => {
    const name = 'examplePackage1';
    const data: PackageData = {
      Content: 'example content',
      JSProgram: 'console.log("Hello, world!");',
      URL: 'https://example.com',
    };
    const version = '1.0.0';

    const result = await createPackageService(name, data, version);

    expect(result).toEqual({
      metadata: {
        Name: 'examplePackage',
        Version: '1.0.0',
        ID: 'examplepackage100',
      },
      data: {
        Content: 'example content',
        JSProgram: 'console.log("Hello, world!");',
        URL: 'https://example.com',
      },
    });
  });

  it('should handle names without numbers correctly', async () => {
    const name = 'examplePackage';
    const data: PackageData = {
      Content: 'example content',
      JSProgram: 'console.log("Hello, world!");',
      URL: 'https://example.com',
    };
    const version = '1.0.0';

    const result = await createPackageService(name, data, version);

    expect(result).toEqual({
      metadata: {
        Name: 'examplePackage',
        Version: '1.0.0',
        ID: 'examplepackage100',
      },
      data: {
        Content: 'example content',
        JSProgram: 'console.log("Hello, world!");',
        URL: 'https://example.com',
      },
    });
  });

  it('should handle versions with multiple dots correctly', async () => {
    const name = 'examplePackage1';
    const data: PackageData = {
      Content: 'example content',
      JSProgram: 'console.log("Hello, world!");',
      URL: 'https://example.com',
    };
    const version = '1.2.3';

    const result = await createPackageService(name, data, version);

    expect(result).toEqual({
      metadata: {
        Name: 'examplePackage',
        Version: '1.2.3',
        ID: 'examplepackage123',
      },
      data: {
        Content: 'example content',
        JSProgram: 'console.log("Hello, world!");',
        URL: 'https://example.com',
      },
    });
  });
});