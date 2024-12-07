// __tests__/util/package/createPackageService.test.ts

import { describe, it, expect } from 'vitest';
import { createPackageService } from '../../../src/util/packageUtils';
import { PackageData } from '../../../types';

describe('createPackageService', () => {
  it('should create a package with the correct metadata and data', async () => {
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
    const name = 'examplePackage';
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

  it('should handle missing Content field', async () => {
    const name = 'examplePackage';
    const data: PackageData = {
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
        JSProgram: 'console.log("Hello, world!");',
        URL: 'https://example.com',
      },
    });
  });

  it('should handle missing JSProgram field', async () => {
    const name = 'examplePackage';
    const data: PackageData = {
      Content: 'example content',
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
        URL: 'https://example.com',
      },
    });
  });

  it('should handle missing URL field', async () => {
    const name = 'examplePackage';
    const data: PackageData = {
      Content: 'example content',
      JSProgram: 'console.log("Hello, world!");',
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
      },
    });
  });

  it('should handle empty data object', async () => {
    const name = 'examplePackage';
    const data: PackageData = {};
    const version = '1.0.0';

    const result = await createPackageService(name, data, version);

    expect(result).toEqual({
      metadata: {
        Name: 'examplePackage',
        Version: '1.0.0',
        ID: 'examplepackage100',
      },
      data: {},
    });
  });
});