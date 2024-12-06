// Test /packages (POST) endpoint

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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

  it('should return a single package with 200 status', async () => {
    // Mock the validateToken function to return true
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

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
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(1);
    expect(responseBody[0]).toHaveProperty('ID', 'Underscore123');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.2.3');
  });

  // Test bounded range
  it('should return a list of packages with 200 status with bounded range query', async () => {
    // Mock the validateToken function to return true
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock the DynamoDB ScanCommand to return some packages
    ddbMock.on(ScanCommand).resolves({
      Items: [
      { ECEfoursixone: 'Underscore123', Name: 'Underscore', Version: '1.2.3' },
      { ECEfoursixone: 'Underscore200', Name: 'Underscore', Version: '2.0.0' },
      ],
      LastEvaluatedKey: undefined,
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers: validHeaders,
      body: JSON.stringify([
        {
          "Version": "Bounded Range (1.2.3-2.1.0)",
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
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(2);
    expect(responseBody[0]).toHaveProperty('ID', 'Underscore123');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.2.3');
    expect(responseBody[1]).toHaveProperty('ID', 'Underscore200');
    expect(responseBody[1]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[1]).toHaveProperty('Version', '2.0.0');
  });

  // Test carat range
  it('should return a list of packages with 200 status with carat query', async () => {
    // Mock the validateToken function to return true
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock the DynamoDB ScanCommand to return some packages
    ddbMock.on(ScanCommand).resolves({
      Items: [
      { ECEfoursixone: 'Underscore123', Name: 'Underscore', Version: '1.2.3' },
      { ECEfoursixone: 'Underscore133', Name: 'Underscore', Version: '1.3.3' },
      { ECEfoursixone: 'Underscore200', Name: 'Underscore', Version: '2.0.0' },
      ],
      LastEvaluatedKey: undefined,
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers: validHeaders,
      body: JSON.stringify([
        {
          "Version": "Carat (^1.2.3)",
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
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(2);
    expect(responseBody[0]).toHaveProperty('ID', 'Underscore123');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.2.3');
    expect(responseBody[1]).toHaveProperty('ID', 'Underscore133');
    expect(responseBody[1]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[1]).toHaveProperty('Version', '1.3.3');
  });

  // Test tilde range
  it('should return a list of packages with 200 status with tilde query', async () => {
    // Mock the validateToken function to return true
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock the DynamoDB ScanCommand to return some packages
    ddbMock.on(ScanCommand).resolves({
      Items: [
      { ECEfoursixone: 'Underscore123', Name: 'Underscore', Version: '1.2.3' },
      { ECEfoursixone: 'Underscore133', Name: 'Underscore', Version: '1.3.3' },
      { ECEfoursixone: 'Underscore134', Name: 'Underscore', Version: '1.3.4' },
      { ECEfoursixone: 'Underscore140', Name: 'Underscore', Version: '1.4.0' },
      { ECEfoursixone: 'Underscore200', Name: 'Underscore', Version: '2.0.0' },
      ],
      LastEvaluatedKey: undefined,
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers: validHeaders,
      body: JSON.stringify([
        {
          "Version": "Tilde (~1.3.3)",
          "Name": "Underscore",
        }
      ]),

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
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(2);
    expect(responseBody[0]).toHaveProperty('ID', 'Underscore133');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.3.3');
    expect(responseBody[1]).toHaveProperty('ID', 'Underscore134');
    expect(responseBody[1]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[1]).toHaveProperty('Version', '1.3.4');
  });

  it('should return 400 if the request body is invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

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
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

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
