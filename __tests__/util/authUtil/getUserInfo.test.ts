// __tests__/util/authUtil/getUserInfo.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import jwt from 'jsonwebtoken';
import { getUserInfo } from '../../../src/util/authUtil';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';
const JWT_SECRET = "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

const validAuthToken = jwt.sign({ name: 'testuser' }, JWT_SECRET);
const invalidAuthToken = 'invalid-token';
const expiredAuthToken = jwt.sign({ name: 'testuser', exp: Math.floor(Date.now() / 1000) - 3600 }, JWT_SECRET);

const mockUserData = {
  username: 'testuser',
  password: 'securepassword',
  isAdmin: true,
  permissions: ['read', 'write'],
  group: 'testgroup',
};

describe('getUserInfo', () => {
  it('should return the user data for a valid token', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockUserData });

    const result = await getUserInfo(`bearer ${validAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual(mockUserData);

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    }).length).toBe(1);
  });

  it('should return 403 if the token is invalid', async () => {
    const result = await getUserInfo(`bearer ${invalidAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(403);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Authentication failed due to invalid or malformed AuthenticationToken.');
  });

  it('should return 404 if the user is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await getUserInfo(`bearer ${validAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('User not found.');

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    }).length).toBe(1);
  });

  it('should return 500 if there is an internal server error', async () => {
    ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

    const result = await getUserInfo(`bearer ${validAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');
    expect(responseBody.details).toBe('Internal Server Error');

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    }).length).toBe(1);
  });
});