// Test handleAuthenticate function
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import jwt from 'jsonwebtoken';
import { handleAuthenticate } from '../../../src/util/authUtil';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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
});

describe('handleAuthenticate', () => {
  it('should return an authentication token for valid credentials', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        username: 'testuser',
        password: 'securepassword',
        isAdmin: true,
        authToken: 'validToken',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        callCount: 10,
      },
    });

    const body = JSON.stringify({
      User: {
        name: 'testuser',
        isAdmin: true,
      },
      Secret: {
        password: 'securepassword',
      },
    });

    const result = await handleAuthenticate(body, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.token).toBe('bearer validToken');

    // Verify that the GetCommand was called with the expected parameters
    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    })).toHaveLength(1);
  });

  it('should return 400 if the request body is missing fields', async () => {
    const body = JSON.stringify({
      User: {
        name: 'testuser',
        // Missing isAdmin field
      },
      // Missing Secret field
    });

    const result = await handleAuthenticate(body, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(400);
  });

  it('should return 401 if the credentials are invalid', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: undefined, // No user found
    });

    const body = JSON.stringify({
      User: {
        name: 'testuser',
        isAdmin: true,
      },
      Secret: {
        password: 'wrongpassword',
      },
    });

    const result = await handleAuthenticate(body, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(401);

    // Verify that the GetCommand was called with the expected parameters
    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    })).toHaveLength(1);
  });

  it('should generate a new token if the existing one is expired', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        username: 'testuser',
        password: 'securepassword',
        isAdmin: true,
        authToken: 'expiredToken',
        expiresAt: Math.floor(Date.now() / 1000) - 3600, // Token expired
        callCount: 10,
      },
    });

    const newAuthToken = 'newToken';
    vi.spyOn(jwt, 'sign').mockImplementation(() => newAuthToken);

    ddbMock.on(UpdateCommand).resolves({});

    const body = JSON.stringify({
      User: {
        name: 'testuser',
        isAdmin: true,
      },
      Secret: {
        password: 'securepassword',
      },
    });

    const result = await handleAuthenticate(body, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.token).toBe(`bearer ${newAuthToken}`);

    // Verify that the GetCommand was called with the expected parameters
    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
    })).toHaveLength(1);

    // Verify that the UpdateCommand was called with the expected parameters
    expect(ddbMock.commandCalls(UpdateCommand, {
      TableName: 'ECE461_UsersTable',
      Key: { username: 'testuser' },
      UpdateExpression: 'SET authToken = :authToken, expiresAt = :expiresAt, callCount = :callCount',
      ExpressionAttributeValues: {
        ':authToken': newAuthToken,
        ':expiresAt': Math.floor(Date.now() / 1000) + 10 * 60 * 60, // 10 hours in seconds
        ':callCount': 0, // Reset call count for the new token
      },
    })).toHaveLength(1);
  });

  it('should return 500 if there is an internal server error', async () => {
    ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

    const body = JSON.stringify({
      User: {
        name: 'testuser',
        isAdmin: true,
      },
      Secret: {
        password: 'securepassword',
      },
    });

    const result = await handleAuthenticate(body, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');
  });
});