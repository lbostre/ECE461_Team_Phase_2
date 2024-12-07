import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { handleReset } from '../../../src/util/authUtil'; // Adjust import path

// Mock jsonwebtoken with proper default export
vi.mock('jsonwebtoken', async (importOriginal) => {
  const jwt = await importOriginal();
  return {
    default: {
      ...jwt,
      verify: vi.fn(),
    },
  };
});

import jwt from 'jsonwebtoken';

// Create a mock client for DynamoDBDocumentClient
const dynamoDbMock = mockClient(DynamoDBDocumentClient);

describe('handleReset function', () => {
  const JWT_SECRET = 'test-secret';

  beforeEach(() => {
    // Clear all mocks before each test
    dynamoDbMock.reset();
    (jwt.verify as vi.Mock).mockClear();
  });

  it('should successfully reset the registry for an admin user', async () => {
    // Mock an admin token
    (jwt.verify as vi.Mock).mockReturnValue({ isAdmin: true });

    // Mock scan command to return empty items for each table
    dynamoDbMock.on(ScanCommand).resolves({ Items: [] });

    // Mock put command for default admin user
    dynamoDbMock.on(PutCommand).resolves({});

    const result = await handleReset('bearer admin-token', dynamoDbMock);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('Registry is reset.');

    // Verify table clearing was called for all three tables
    const tablesToClear = [
      'ECE461_UsersTable', 
      'ECE461_PackagesTable', 
      'ECE461_CostsTable'
    ];

    // Check scan calls
    const scanCalls = dynamoDbMock.commandCalls(ScanCommand);
    expect(scanCalls.length).toBe(tablesToClear.length);
    scanCalls.forEach((call, index) => {
      expect(call.args[0].input.TableName).toBe(tablesToClear[index]);
    });

    // Verify default admin user is created
    const putCalls = dynamoDbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    const putCall = putCalls[0];
    expect(putCall.args[0].input).toMatchObject({
      TableName: 'ECE461_UsersTable',
      Item: expect.objectContaining({
        username: 'ece30861defaultadminuser',
        isAdmin: true
      })
    });
  });

  it('should return 401 if the user is not an admin', async () => {
    // Mock a non-admin token
    (jwt.verify as vi.Mock).mockReturnValue({ isAdmin: false });

    const result = await handleReset('bearer non-admin-token', dynamoDbMock);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('You do not have permission to reset the registry.');
  });

  it('should handle errors during table clearing', async () => {
    // Mock an admin token
    (jwt.verify as vi.Mock).mockReturnValue({ isAdmin: true });

    // Simulate an error during table clearing
    dynamoDbMock.on(ScanCommand).rejects(new Error('Database scan error'));

    const result = await handleReset('bearer admin-token', dynamoDbMock);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal Server Error');
  });

  it('should handle JWT verification errors', async () => {
    // Simulate JWT verification failure
    (jwt.verify as vi.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const result = await handleReset('bearer invalid-token', dynamoDbMock);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal Server Error');
  });
});