import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { handleReset } from '../../../src/util/authUtil'; // Adjust import path
import { clearS3Folder } from '../../../src/util/packageUtils'; // Adjust import path
import jwt from 'jsonwebtoken';

const JWT_SECRET = "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";
const validAdminAuthToken = jwt.sign({ name: 'testadminuser', isAdmin: true }, JWT_SECRET);
const validRegularAuthToken = jwt.sign({ name: 'testuser', isAdmin: false }, JWT_SECRET);
const invalidAuthToken = 'invalid-auth-token';

// Create mock for the clearS3Folder function
vi.mock('../../../src/util/packageUtils', async () => {
  const originalModule = await vi.importActual<typeof import('../../../src/util/packageUtils')>('../../../src/util/packageUtils');
  return {
    ...originalModule,
    clearS3Folder: vi.fn(),
  };
});

// Create a mock client for DynamoDBDocumentClient
const dynamoDbMock = mockClient(DynamoDBDocumentClient);
const s3Mock = mockClient(S3Client);
const bucketName = 'ece461phase2';

describe('handleReset function', () => {
  const JWT_SECRET = 'test-secret';

  beforeEach(() => {
    dynamoDbMock.reset();
  });

  it('should successfully reset the registry for an admin user', async () => {
    // Mock scan command to return empty items for each table
    dynamoDbMock.on(ScanCommand).resolves({ Items: [] });

    // Mock put command for default admin user
    dynamoDbMock.on(PutCommand).resolves({});

    // Mock clear S3 folder function
    vi.mocked(clearS3Folder).mockResolvedValue({ success: true });

    const result = await handleReset(validAdminAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Registry is reset');

    // Verify table clearing was called for all three tables
    const tablesToClear = [
      'ECE461_UsersTable', 
      'ECE461_Database', 
      'ECE461_CostTable',
      'ECE461_HistoryTable',
    ];

    // Check scan calls
    const scanCalls = dynamoDbMock.commandCalls(ScanCommand);
    expect(scanCalls.length).toBe(tablesToClear.length);
    scanCalls.forEach((call, index) => {
      expect(call.args[0].input.TableName).toBe(tablesToClear[index]);
    });
  });

  it('should return 401 if the user is not an admin', async () => {
    // Mock a non-admin token

    const result = await handleReset(validRegularAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('You do not have permission to reset the registry.');
  });

  it('should handle errors during table clearing', async () => {
    // Simulate an error during table clearing
    dynamoDbMock.on(ScanCommand).rejects(new Error('Database scan error'));

    const result = await handleReset(validAdminAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal Server Error');
  });

  it('should handle JWT verification errors', async () => {
    const result = await handleReset(invalidAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient, s3Mock as unknown as S3Client, bucketName);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal Server Error');
  });
});