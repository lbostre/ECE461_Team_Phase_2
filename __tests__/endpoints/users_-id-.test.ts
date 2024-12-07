// __tests__/endpoints/users_-id-_delete.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../index';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken, deleteUser } from '../../src/util/authUtil';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken and deleteUser functions
vi.mock('../../src/util/authUtil', async () => {
    const originalModule = await vi.importActual<typeof import('../../src/util/authUtil')>('../../src/util/authUtil');
    return {
        ...originalModule,
        validateToken: vi.fn(),
        deleteUser: vi.fn(),
    };
});

beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
});

const validAuthToken = 'valid-auth-token';
const invalidAuthToken = 'invalid-auth-token';

describe('/users/{id} DELETE endpoint', () => {
    it('should delete the user successfully', async () => {
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });
        vi.mocked(deleteUser).mockResolvedValue({
            statusCode: 200,
            headers: {},
            body: JSON.stringify({ message: 'User deleted successfully.' }),
        });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'DELETE',
            path: '/users/testuser',
            headers: { 'X-Authorization': validAuthToken },
            pathParameters: { id: 'testuser' },
            queryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as any,
            resource: '',
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.message).toBe('User deleted successfully.');
    });

    it('should return 403 if the authentication token is missing or invalid', async () => {
        vi.mocked(validateToken).mockResolvedValue({ isValid: false });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'DELETE',
            path: '/users/testuser',
            headers: { 'X-Authorization': invalidAuthToken },
            pathParameters: { id: 'testuser' },
            queryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as any,
            resource: '',
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(403);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Authentication failed due to invalid or missing AuthenticationToken.');
    });

    it('should return 403 if the user is not authorized to delete the account', async () => {
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });
        vi.mocked(deleteUser).mockResolvedValue({
            statusCode: 403,
            headers: {},
            body: JSON.stringify({ error: 'Unauthorized action.' }),
        });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'DELETE',
            path: '/users/testuser',
            headers: { 'X-Authorization': validAuthToken },
            pathParameters: { id: 'testuser' },
            queryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as any,
            resource: '',
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(403);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Unauthorized action.');
    });

    it('should return 404 if the endpoint does not exist', async () => {

        const event: APIGatewayProxyEvent = {
            httpMethod: 'HEAD',
            path: '/invalid-path',
            headers: { 'X-Authorization': validAuthToken },
            pathParameters: { id: 'testuser' },
            queryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as any,
            resource: '',
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(404);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Path Not Found');
    });

    it('should return 403 if no authentication token is provided', async () => {
        vi.mocked(validateToken).mockResolvedValue({ isValid: false });

        const event: APIGatewayProxyEvent = {
            httpMethod: 'DELETE',
            path: '/users/testuser',
            headers: {},
            pathParameters: { id: 'testuser' },
            queryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as any,
            resource: '',
        };

        const result = await handler(event);

        expect(result.statusCode).toBe(403);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Authentication failed due to invalid or missing AuthenticationToken.');
    });
});