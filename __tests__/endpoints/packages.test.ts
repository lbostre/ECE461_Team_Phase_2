// Test /packages (POST) endpoint

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken } from '../../src/util/authUtil';
import { mockClient } from 'aws-sdk-client-mock';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken function
vi.mock('../../src/util/authUtil', () => ({
  validateToken: vi.fn(),
}));

beforeEach(() => {
  ddbMock.reset();
});

describe('/packages POST endpoint', () => {
  const validAuthToken = 'valid-auth-token';
  const validHeaders = { 'X-Authorization': validAuthToken };
  const invalidHeaders = {};

  it('should return a list of packages matching the query with a 200 status', async () => {
    // Mock the validateToken function to return true
    vi.mocked(validateToken).mockResolvedValue(true);

    // Mock the DynamoDB QueryCommand to return some packages
    ddbMock.on(QueryCommand).resolves({
      Items: [
      { ECEfoursixone: 'Underscore123', Name: 'Underscore', Version: '1.2.3' },
      ],
      LastEvaluatedKey: undefined,
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers: validHeaders,
      body: JSON.stringify([
        {
          "Version": "Exact (1.2.3)",
          "Name": "Underscore",
        }
      ]), // Query to get all packages

      queryStringParameters: { offset: '0' },
      pathParameters: null,
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    console.log(result.headers);
    // expect(result.headers).toHaveProperty('offset', '1'); // Assuming 3 packages returned
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(1);
    expect(responseBody[0]).toHaveProperty('ID', 'underscore');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.2.3');
  });

  it('should return 400 if the request body is invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue(true);

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers: validHeaders,
      body: JSON.stringify({ invalid: 'data' }), // Invalid request body
      queryStringParameters: null,
      pathParameters: null,
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error');
  });

  it('should return 403 if authentication token is missing or invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue(false);

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers: invalidHeaders, // Missing 'X-Authorization'
      body: JSON.stringify([{ Name: '*' }]),
      queryStringParameters: null,
      pathParameters: null,
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
    expect(responseBody).toHaveProperty('error');
  });
});
