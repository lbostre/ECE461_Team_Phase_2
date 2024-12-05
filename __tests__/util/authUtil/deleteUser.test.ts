// Test deleteUser function
import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import jwt from 'jsonwebtoken';
import { deleteUser } from '../../../src/util/authUtil';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';
const JWT_SECRET = 'XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

beforeEach(() => {
  ddbMock.reset();
});

describe('deleteUser', () => {
    it('should delete their own account if the name matches their username', async () => {
        const token = jwt.sign({ name: 'testuser', isAdmin: false }, JWT_SECRET);

        const result = await deleteUser(`bearer ${token}`, 'testuser', ddbMock as unknown as DynamoDBDocumentClient);

        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.message).toBe('User deleted successfully.');
    });

    it('should return 403 if the user is not authorized to delete the account', async () => {
        const token = jwt.sign({ name: 'nottestuser', isAdmin: false }, JWT_SECRET);

        const result = await deleteUser(`bearer ${token}`, 'testuser', ddbMock as unknown as DynamoDBDocumentClient);

        expect(result.statusCode).toBe(403);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Unauthorized action.');
    });

    it('should delete the user account if the user is authorized', async () => {
        const token = jwt.sign({ name: 'adminuser', isAdmin: true }, JWT_SECRET);

        ddbMock.on(DeleteCommand).resolves({});

        const result = await deleteUser(`bearer ${token}`, 'testuser', ddbMock as unknown as DynamoDBDocumentClient);

        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.message).toBe('User deleted successfully.');
    });
});