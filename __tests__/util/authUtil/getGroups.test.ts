// __tests__/util/authUtil/getGroups.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import jwt from 'jsonwebtoken';
import { getGroups } from '../../../src/util/authUtil';
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
  group: 'testgroup',
};

describe('getGroups', () => {
  it('should return the group name for a valid token', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockUserData });

    const result = await getGroups(`bearer ${validAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toBe('testgroup');

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    }).length).toBe(1);
  });

  it('should return null if the token is invalid', async () => {
    const result = await getGroups(`bearer ${invalidAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toBeNull();
  });

  it('should return null if the user is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await getGroups(`bearer ${validAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toBeNull();

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    }).length).toBe(1);
  });

  it('should return null if there is an internal server error', async () => {
    ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

    const result = await getGroups(`bearer ${validAuthToken}`, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toBeNull();

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    }).length).toBe(1);
  });
});