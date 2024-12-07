// __tests__/util/packageUtils/fetchPackageById.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { fetchPackageById, streamToBuffer } from '../../../src/util/packageUtils';
import { getUserInfo } from '../../../src/util/authUtil';
import { Readable } from 'stream';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock the getUserInfo function
vi.mock('../../../src/util/authUtil', () => ({
  getUserInfo: vi.fn(),
}));

// Mock the streamToBuffer function and fetchPackageById function
vi.mock('../../../src/util/packageUtils', async () => {
  const originalModule = await vi.importActual<typeof import('../../../src/util/packageUtils')>('../../../src/util/packageUtils');
  return {
    ...originalModule,
    fetchPackageById: originalModule.fetchPackageById,
    streamToBuffer: vi.fn(),
  };
});

beforeEach(() => {
  ddbMock.reset();
  s3Mock.reset();
  vi.clearAllMocks();
});

describe('fetchPackageById', () => {
  const id = 'examplePackage123';
  const bucketName = 'test-bucket';
  const authToken = 'valid-auth-token';

  const mockUserInfo = {
    username: 'testuser',
  };

  const mockDynamoResponse = {
    Item: {
      ECEfoursixone: id,
      Version: '1.0.0',
      URL: 'https://example.com',
      JSProgram: 'console.log("Hello, world!");',
      DownloadInfo: [],
    },
  };

  const mockS3Response = {
    Body: Readable.from([Buffer.from('example content')]),
  };

  beforeEach(() => {
    vi.mocked(getUserInfo).mockResolvedValue(mockUserInfo);
    ddbMock.on(GetCommand).resolves(mockDynamoResponse);
    s3Mock.on(GetObjectCommand).resolves(mockS3Response);
    vi.mocked(streamToBuffer).mockResolvedValue(Buffer.from('example content'));
  });

  it('should fetch package data successfully', async () => {
    const result = await fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName, authToken);

    expect(result).toEqual({
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
    });

    expect(getUserInfo).toHaveBeenCalledWith(authToken, ddbMock);
    expect(ddbMock.commandCalls(GetCommand).length).toBe(1);
    expect(s3Mock.commandCalls(GetObjectCommand).length).toBe(1);
  });

  it('should return null if the package data is missing', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName, authToken);

    expect(result).toBeNull();
    expect(ddbMock.commandCalls(GetCommand).length).toBe(1);
  });

  it('should return null if there is an error fetching package data', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

    const result = await fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName, authToken);

    expect(result).toBeNull();
    expect(ddbMock.commandCalls(GetCommand).length).toBe(1);
  });
});