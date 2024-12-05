// Test handleAuthenticate function
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import jwt from 'jsonwebtoken';
import { validateToken } from '../../../src/util/authUtil';
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

describe('validateToken', () => {
    it('should return false if the token is invalid', async () => {
        const result = await validateToken('invalid-token', ddbMock as unknown as DynamoDBDocumentClient);
        expect(result).toBe(false);
    });

    it('should return false if the token is expired or call count exceeds limit', async () => {
        const token = jwt.sign({ name: 'testuser' }, JWT_SECRET);
        ddbMock.on(GetCommand).resolves({
            Item: {
                username: 'testuser',
                callCount: 1001,
                expiresAt: Math.floor(Date.now() / 1000) - 3600, // Token expired
            },
        });

        const result = await validateToken(token, ddbMock as unknown as DynamoDBDocumentClient);
        expect(result).toBe(false);
    });

    it('should return true if the token is valid and unexpired', async () => {
        const token = jwt.sign({ name: 'testuser' }, JWT_SECRET);
        ddbMock.on(GetCommand).resolves({
            Item: {
                username: 'testuser',
                callCount: 10,
                expiresAt: Math.floor(Date.now() / 1000) + 3600, // Token unexpired
            },
        });

        ddbMock.on(UpdateCommand).resolves({});

        const result = await validateToken(token, ddbMock as unknown as DynamoDBDocumentClient);
        expect(result).toBe(true);
    });

    it('should return false if there is an internal server error', async () => {
        const token = jwt.sign({ name: 'testuser' }, JWT_SECRET);
        ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

        const result = await validateToken(token, ddbMock as unknown as DynamoDBDocumentClient);
        expect(result).toBe(false);
    });
});
