// Test /package/{id}/cost (GET)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken } from '../../src/util/authUtil';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken functions
vi.mock('../../src/util/authUtil', () => ({
    validateToken: vi.fn(),
}));

beforeEach(() => {
    ddbMock.reset();
});

describe('/package/{id}/cost endpoint', () => {
    const validAuthToken = 'valid-auth-token';
    const invalidHeaders = {};

    it('should return the package cost for a valid ID without dependencies', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });

        // Mock the DynamoDB GetCommand to return a predefined response for valid package ID
        ddbMock.on(GetCommand, {
        TableName: 'ECE461_CostTable',
        Key: { packageID: '357898765' },
        }).resolves({
        Item: {
            packageID: '357898765',
            standaloneCost: 50.0,
            totalCost: 95.0,
            dependencies: {
                '988645763': {
                standaloneCost: 20.0,
                totalCost: 45.0,
                },
            },
        },
        });

        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/357898765/cost',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: '357898765' },
        queryStringParameters: { dependency: 'false' },
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
        expect(responseBody).toHaveProperty('357898765');
        expect(responseBody['357898765']).toHaveProperty('totalCost', 50.0);
    });

    it('should return 400 if the package ID is missing', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });
        
        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/357898765/cost',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: '' },
        queryStringParameters: { dependency: 'false' },
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
        path: '/package/357898765/cost',
        headers: invalidHeaders,
        pathParameters: { id: '357898765' },
        queryStringParameters: { dependency: 'false' },
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
        // Mock the validateToken function to return true for valid tokens and false for invalid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });

        // Mock the DynamoDB GetCommand to return undefined for nonexistent package ID
        ddbMock.on(GetCommand).resolves({ Item: undefined });

        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/nonexistent/cost',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: 'nonexistent' },
        queryStringParameters: { dependency: 'false' },
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
    });

    it('should return 500 if there is an internal server error', async () => {
        // Mock the validateToken function to return true for valid tokens
        vi.mocked(validateToken).mockResolvedValue({ isValid: true });

        ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

        const event: APIGatewayProxyEvent = {
        httpMethod: 'GET',
        path: '/package/357898765/cost',
        headers: { 'X-Authorization': validAuthToken },
        pathParameters: { id: '357898765' },
        queryStringParameters: { dependency: 'false' },
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
    });
});
