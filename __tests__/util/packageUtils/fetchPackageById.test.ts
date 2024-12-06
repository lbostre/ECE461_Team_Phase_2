// Test fetchPackageById function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { fetchPackageById, streamToBuffer } from '../../../src/util/packageUtils';

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock streamToBuffer
vi.mock('../../../src/util/packageUtils', () => {
  const originalModule = vi.importActual('../../../src/util/packageUtils');
  return {
    ...originalModule,
    streamToBuffer: vi.fn(),
  };
});

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

beforeEach(() => {
  s3Mock.reset();
  ddbMock.reset();
  vi.clearAllMocks();
});

describe('fetchPackageById', () => {
  const id = 'examplePackage123';
  const bucketName = 'test-bucket';

  it('should fetch the package metadata and content', async () => {
    // Mock DynamoDB GetCommand to return a predefined response
    ddbMock.on(GetCommand).resolves({
      Item: {
        Version: '1.0.0',
        URL: 'https://example.com',
        JSProgram: 'console.log("Hello, world!");',
      },
    });

    // Mock S3 GetObjectCommand to return a successful response
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('example content');
        },
      },
    });

    // Mock streamToBuffer to return the buffer content
    vi.mocked(streamToBuffer).mockResolvedValue(Buffer.from('example content'));

    const result = await fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result).toEqual({
      metadata: {
        Name: 'examplePackage',
        Version: '1.0.0',
        ID: 'examplePackage123',
      },
      data: {
        URL: 'https://example.com',
        JSProgram: 'console.log("Hello, world!");',
        Content: Buffer.from('example content').toString('base64'),
      },
    });

    // Check that DynamoDB GetCommand was called with the correct parameters
    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    });

    // Check that S3 GetObjectCommand was called with the correct parameters
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucketName,
      Key: `packages/${id}.zip`,
    });
  });

  it('should return null if the package metadata is not found', async () => {
    // Mock DynamoDB GetCommand to return undefined
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result).toBeNull();

    // Check that DynamoDB GetCommand was called with the correct parameters
    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    });

    // Check that S3 GetObjectCommand was not called
    expect(s3Mock.commandCalls(GetObjectCommand).length).toBe(0);
  });

  it('should throw an error if the S3 object body is undefined', async () => {
    // Mock DynamoDB GetCommand to return a predefined response
    ddbMock.on(GetCommand).resolves({
      Item: {
        Version: '1.0.0',
        URL: 'https://example.com',
        JSProgram: 'console.log("Hello, world!");',
      },
    });

    // Mock S3 GetObjectCommand to return a response with undefined Body
    s3Mock.on(GetObjectCommand).resolves({
      Body: undefined,
    });

    await expect(fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName)).rejects.toThrow('S3 object body is undefined');

    // Check that DynamoDB GetCommand was called with the correct parameters
    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    });

    // Check that S3 GetObjectCommand was called with the correct parameters
    expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucketName,
      Key: `packages/${id}.zip`,
    });
  });

  it('should handle errors during fetching', async () => {
    // Mock DynamoDB GetCommand to throw an error
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

    const result = await fetchPackageById(id, ddbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result).toBeNull();

    // Check that DynamoDB GetCommand was called with the correct parameters
    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    });

    // Check that S3 GetObjectCommand was not called
    expect(s3Mock.commandCalls(GetObjectCommand).length).toBe(0);
  });
});