// __tests__/endpoints/handlePackageGet.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackageGet } from '../../../src/package';
import { fetchPackageById } from '../../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock the fetchPackageById function
vi.mock('../../../src/util/packageUtils', async () => {
  const originalModule = await vi.importActual<typeof import('../../../src/util/packageUtils')>('../../../src/util/packageUtils');
  return {
    ...originalModule,
    fetchPackageById: vi.fn(),
  };
});

beforeEach(() => {
  ddbMock.reset();
  s3Mock.reset();
  vi.clearAllMocks();
});

describe('handlePackageGet', () => {
  const id = 'examplePackage123';
  const bucketName = 'test-bucket';
  const authToken = 'valid-auth-token';

  const mockPackageData = {
    metadata: {
      Name: 'examplePackage',
      Version: '1.0.0',
      ID: id,
    },
    data: {
      URL: 'https://example.com',
      JSProgram: 'console.log("Hello, world!");',
      Content: 'ZXhhbXBsZSBjb250ZW50', // Base64 encoded content
    },
  };

  beforeEach(() => {
    vi.mocked(fetchPackageById).mockResolvedValue(mockPackageData);
  });

  it('should fetch package data successfully', async () => {
    const result = await handlePackageGet(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName, authToken);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toEqual(mockPackageData);

    expect(fetchPackageById).toHaveBeenCalledWith(id, ddbMock, s3Mock, bucketName, authToken);
  });

  it('should return 404 if the package is not found', async () => {
    vi.mocked(fetchPackageById).mockResolvedValue(null);

    const result = await handlePackageGet(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName, authToken);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package not found');

    expect(fetchPackageById).toHaveBeenCalledWith(id, ddbMock, s3Mock, bucketName, authToken);
  });

  it('should return 500 if there is an internal server error', async () => {
    vi.mocked(fetchPackageById).mockRejectedValue(new Error('Internal Server Error'));

    const result = await handlePackageGet(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName, authToken);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');

    expect(fetchPackageById).toHaveBeenCalledWith(id, ddbMock, s3Mock, bucketName, authToken);
  });
});