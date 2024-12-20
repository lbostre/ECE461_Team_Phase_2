// Test /package/{id}/rate (GET)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken } from '../../src/util/authUtil';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the handleAuthenticate and validateToken functions
vi.mock('../../src/util/authUtil', () => ({
    validateToken: vi.fn(),
}));

beforeEach(() => {
    ddbMock.reset();
});

describe('/package/{id}/rate endpoint', () => {
    const validAuthToken = 'valid-auth-token';
    const invalidHeaders = {};

    it('should return the package rating for a valid package ID', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });

        // Mock the DynamoDB GetCommand to return a predefined response for valid package ID
        ddbMock.on(GetCommand, {
            TableName: 'ECE461_Database',
            Key: { ECEfoursixone: 'valid-package-id' },
            }).resolves({
            Item: {
                Metrics: {
                    NetScore: 0.8,
                    RampUp: 0.7,
                    Correctness: 0.9,
                    BusFactor: 0.6,
                    ResponsiveMaintainer: 0.8,
                    LicenseScore: 1.0,
                },
            },
            });
        
        
        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/valid-package-id/rate',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: 'valid-package-id' },
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
        expect(responseBody).toHaveProperty('NetScore', 0.8);
        expect(responseBody).toHaveProperty('RampUp', 0.7);
        expect(responseBody).toHaveProperty('Correctness', 0.9);
        expect(responseBody).toHaveProperty('BusFactor', 0.6);
        expect(responseBody).toHaveProperty('ResponsiveMaintainer', 0.8);
        expect(responseBody).toHaveProperty('LicenseScore', 1.0);
    });

    it('should return 400 if the package ID is missing', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });
        
        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package//rate',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: '' },
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

        expect(result.statusCode).toBe(400);
    });

    it('should return 403 if authentication token is missing or invalid', async () => {
        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/valid-package-id/rate',
        headers: invalidHeaders,
        pathParameters: { id: 'valid-package-id' },
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
    });

    it('should return 404 if the package does not exist', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });

        // Mock the DynamoDB GetCommand to return undefined for invalid package ID
        ddbMock.on(GetCommand, {
            TableName: 'ECE461_Database',
            Key: { ECEfoursixone: 'invalid-package-id' },
            }).resolves({ Item: undefined });

        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/invalid-package-id/rate',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: 'invalid-package-id' },
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
        expect(responseBody.error).toBe('Metrics not found for this package');
    });

    it('should return 500 if there is an internal server error', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });

        ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/valid-package-id/rate',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: 'valid-package-id' },
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

        expect(result.statusCode).toBe(500);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Failed to fetch metrics');
    });
});
