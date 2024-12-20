// __tests__/util/package/handlePackageByRegEx.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackageByRegEx } from '../../../src/package';
import { fetchReadmesBatch } from '../../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the fetchReadmesBatch function
vi.mock('../../../src/util/packageUtils', async () => {
  const original = await vi.importActual('../../../src/util/packageUtils');
  return {
    ...original,
    fetchReadmesBatch: vi.fn(),
  };
});

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

describe('handlePackageByRegEx', () => {
  const validBody = JSON.stringify({ RegEx: '.*?Underscore.*' });

  const mockItems = [
    {
      ECEfoursixone: 'Underscore123',
      Version: '1.2.3',
      URL: 'https://github.com/jashkenas/underscore',
    },
    {
      ECEfoursixone: 'Underscore133',
      Version: '1.3.3',
      URL: 'https://github.com/jashkenas/underscore',
    },
    {
      ECEfoursixone: 'repo',
      Version: '1.3.4',
      URL: 'https://github.com/user/repo',
    },
  ];

  const mockResponse = {
    Items: mockItems,
  };

  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should return a list of packages matching the regex', async () => {
    ddbMock.on(ScanCommand).resolves(mockResponse);
    vi.mocked(fetchReadmesBatch).mockResolvedValue({
      'https://github.com/jashkenas/underscore': 'Underscore README content',
    });

    const result = await handlePackageByRegEx(validBody, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(2);
    expect(responseBody[0]).toHaveProperty('ID', 'Underscore123');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.2.3');
    expect(responseBody[1]).toHaveProperty('ID', 'Underscore133');
    expect(responseBody[1]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[1]).toHaveProperty('Version', '1.3.3');
  });

  it('should return 400 if the request body is missing', async () => {
    const result = await handlePackageByRegEx(null, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid.');
  });

  it('should return 400 if the request body contains invalid JSON', async () => {
    const result = await handlePackageByRegEx('invalid-json', ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Invalid JSON in request body.');
  });

  it('should return 400 if the regex in the request body is invalid', async () => {
    const invalidBody = JSON.stringify({ RegEx: '[' });

    const result = await handlePackageByRegEx(invalidBody, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('The provided RegEx pattern is invalid.');
  });

  it('should return 400 if the regex in the request body is not a string', async () => {
    const invalidBody = JSON.stringify({ RegEx: 1 });

    const result = await handlePackageByRegEx(invalidBody, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid.');
  });

  it('should return 404 if no package is found under the regex', async () => {
    ddbMock.on(ScanCommand).resolves(mockResponse);
    vi.mocked(fetchReadmesBatch).mockResolvedValue({
      'https://github.com/jashkenas/underscore': 'Underscore README content',
    });

    // Adjust valid body to match no packages
    const invalidRegex = JSON.stringify({ RegEx: '.*?Invalid.*' });

    const result = await handlePackageByRegEx(invalidRegex, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('No package found under this regex.');
  });

  it('should handle internal server errors gracefully', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    const result = await handlePackageByRegEx(validBody, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');
  });

  // Bonus RegEx tests
  // it('should return 404 if no package is found under the regex "ece461rules"', async () => {
  //   ddbMock.on(ScanCommand).resolves(mockResponse);
  //   vi.mocked(fetchReadmesBatch).mockResolvedValue({
  //     'https://github.com/jashkenas/underscore': 'Underscore README content',
  //   });

  //   // Use regex that matches no packages
  //   const noMatchRegex = JSON.stringify({ RegEx: 'ece461rules' });

  //   const result = await handlePackageByRegEx(noMatchRegex, ddbMock as unknown as DynamoDBDocumentClient);

  //   expect(result.statusCode).toBe(404);
  //   const responseBody = JSON.parse(result.body);
  //   expect(responseBody.error).toBe('No package found under this regex.');
  // });

  // it('should return 400 for the regex "(a{1,99999}){1,99999}$"', async () => {
  //   ddbMock.on(ScanCommand).resolves(mockResponse);
  //   vi.mocked(fetchReadmesBatch).mockResolvedValue({
  //     'https://github.com/jashkenas/underscore': 'Underscore README content',
  //   });

  //   // Use regex that matches no packages
  //   const noMatchRegex = JSON.stringify({ RegEx: '(a{1,99999}){1,99999}$' });

  //   const result = await handlePackageByRegEx(noMatchRegex, ddbMock as unknown as DynamoDBDocumentClient);

  //   expect(result.statusCode).toBe(400);
  //   const responseBody = JSON.parse(result.body);
  //   expect(responseBody.error).toBe('No package found under this regex.');
  // });

  // it('should return 404 for the regex "(a|aa)*$"', async () => {
  //   ddbMock.on(ScanCommand).resolves(mockResponse);
  //   vi.mocked(fetchReadmesBatch).mockResolvedValue({
  //     'https://github.com/jashkenas/underscore': 'Underscore REDME content',
  //   });

  //   // Use regex that matches no packages
  //   const noMatchRegex = JSON.stringify({ RegEx: '(a|aa)*$' });

  //   const result = await handlePackageByRegEx(noMatchRegex, ddbMock as unknown as DynamoDBDocumentClient);
  //   console.log(result);

  //   expect(result.statusCode).toBe(404);
  //   const responseBody = JSON.parse(result.body);
  //   expect(responseBody.error).toBe('No package found under this regex.');
  // });
});