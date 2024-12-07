import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { handleReset } from '../../../src/util/authUtil'; // Adjust import path
import jwt from 'jsonwebtoken';

const JWT_SECRET = "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";
const validAdminAuthToken = jwt.sign({ name: 'testadminuser', isAdmin: true }, JWT_SECRET);
const validRegularAuthToken = jwt.sign({ name: 'testuser', isAdmin: false }, JWT_SECRET);
const invalidAuthToken = 'invalid-auth-token';

// Create a mock client for DynamoDBDocumentClient
const dynamoDbMock = mockClient(DynamoDBDocumentClient);

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

    const result = await handleReset(validAdminAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient);

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

    const result = await handleReset(validRegularAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('You do not have permission to reset the registry.');
  });

  it('should handle errors during table clearing', async () => {
    // Simulate an error during table clearing
    dynamoDbMock.on(ScanCommand).rejects(new Error('Database scan error'));

    const result = await handleReset(validAdminAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal Server Error');
  });

  it('should handle JWT verification errors', async () => {
    const result = await handleReset(invalidAuthToken, dynamoDbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe('Internal Server Error');
  });
});