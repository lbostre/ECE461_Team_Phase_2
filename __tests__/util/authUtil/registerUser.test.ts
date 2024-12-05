// Test handleAuthenticate function
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import { registerUser } from '../../../src/util/authUtil';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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

describe('registerUser', () => {
    it('should return 403 if the user is not an admin', async () => {
        ddbMock.on(GetCommand).resolves({
          Item: {
            username: 'newuser',
            password: 'password',
            isAdmin: false,
            permissions: [],
            group: 'group',
          },
        });
        ddbMock.on(UpdateCommand).resolves({});
        const token = jwt.sign({ name: 'testuser', isAdmin: false }, JWT_SECRET);
        const newUser = {
            name: 'newuser',
            password: 'password',
            isAdmin: false,
            permissions: [],
            group: 'group',
        };

        const result = await registerUser(`bearer ${token}`, newUser, ddbMock);

        expect(result.statusCode).toBe(403);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Only admins can register users.');
    });

    it('should register a new user if the user is an admin', async () => {
        const token = jwt.sign({ name: 'adminuser', isAdmin: true }, JWT_SECRET);
        const newUser = {
            name: 'newuser',
            password: 'password',
            isAdmin: false,
            permissions: [],
            group: 'group',
        };

        ddbMock.on(PutCommand).resolves({});

        const result = await registerUser(`bearer ${token}`, newUser, ddbMock);

        expect(result.statusCode).toBe(201);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.message).toBe('User registered successfully.');
    });

    it('should return 500 if there is an internal server error', async () => {
        const token = jwt.sign({ name: 'adminuser', isAdmin: true }, JWT_SECRET);
        const newUser = {
            name: 'newuser',
            password: 'password',
            isAdmin: false,
            permissions: [],
            group: 'group',
        };

        ddbMock.on(PutCommand).rejects(new Error('Internal Server Error'));

        const result = await registerUser(`bearer ${token}`, newUser, ddbMock);

        expect(result.statusCode).toBe(500);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Internal Server Error');
    });
});