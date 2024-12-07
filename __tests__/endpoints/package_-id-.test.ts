// __tests__/endpoints/package_-id-_get.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../index';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken } from '../../src/util/authUtil';
import { handlePackageGet, handlePackageUpdate } from '../../src/package';
import jwt from 'jsonwebtoken';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken function
vi.mock('../../src/util/authUtil', async () => {
  const originalModule = await vi.importActual<typeof import('../../src/util/authUtil')>('../../src/util/authUtil');
  return {
    ...originalModule,
    validateToken: vi.fn(),
  };
});

// Mock the handlePackageGet function
vi.mock('../../src/package', async () => {
  const originalModule = await vi.importActual<typeof import('../../src/package')>('../../src/package');
  return {
    ...originalModule,
    handlePackageGet: vi.fn(),
    handlePackageUpdate: vi.fn(),
  };
});

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

const JWT_SECRET = "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";
const validAuthToken = jwt.sign({ name: 'testuser' }, JWT_SECRET);
const invalidAuthToken = 'invalid-auth-token';
const validHeaders = { 'X-Authorization': `bearer ${validAuthToken}` };
const invalidHeaders = { 'X-Authorization': `bearer ${invalidAuthToken}` };

describe('/package/{id} GET endpoint', () => {
  it('should return the package data successfully', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handlePackageGet).mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({
        metadata: {
          Name: 'examplePackage',
          Version: '1.0.0',
          ID: 'examplePackage123',
        },
        data: {
          URL: 'https://example.com',
          JSProgram: 'console.log("Hello, world!");',
          Content: 'ZXhhbXBsZSBjb250ZW50', // Base64 encoded content
        },
      }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/examplePackage123',
      headers: validHeaders,
      queryStringParameters: null,
      pathParameters: { id: 'examplePackage123' },
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
    expect(responseBody.metadata).toHaveProperty('Name', 'examplePackage');
    expect(responseBody.metadata).toHaveProperty('Version', '1.0.0');
    expect(responseBody.metadata).toHaveProperty('ID', 'examplePackage123');
    expect(responseBody.data).toHaveProperty('URL', 'https://example.com');
    expect(responseBody.data).toHaveProperty('JSProgram', 'console.log("Hello, world!");');
    expect(responseBody.data).toHaveProperty('Content', 'ZXhhbXBsZSBjb250ZW50');
  });

  it('should return 403 if the authentication token is missing or invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: false });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/examplePackage123',
      headers: invalidHeaders,
      queryStringParameters: null,
      pathParameters: { id: 'examplePackage123' },
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

  it('should return 404 if the package is not found', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handlePackageGet).mockResolvedValue({
      statusCode: 404,
      headers: {},
      body: JSON.stringify({ error: 'Package not found' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/nonexistentPackage',
      headers: validHeaders,
      queryStringParameters: null,
      pathParameters: { id: 'nonexistentPackage' },
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
    expect(responseBody.error).toBe('Package not found');
  });
});

describe('/package/{id} POST endpoint', () => {
  it('should update the package successfully', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handlePackageUpdate).mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({ message: 'Package updated successfully.' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/examplePackage123',
      headers: validHeaders,
      pathParameters: { id: 'examplePackage123' },
      body: JSON.stringify({
        metadata: {
          Name: 'examplePackage',
          Version: '1.0.1',
          ID: 'examplePackage123',
        },
        data: {
          Content: 'example content',
          JSProgram: 'console.log("Hello, world!");',
          URL: 'https://example.com',
        },
      }),
      queryStringParameters: null,
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
    expect(responseBody.message).toBe('Package updated successfully.');
  });

  it('should return 403 if the authentication token is missing or invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: false });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/examplePackage123',
      headers: invalidHeaders,
      pathParameters: { id: 'examplePackage123' },
      body: JSON.stringify({
        metadata: {
          Name: 'examplePackage',
          Version: '1.0.1',
          ID: 'examplePackage123',
        },
        data: {
          Content: 'example content',
          JSProgram: 'console.log("Hello, world!");',
          URL: 'https://example.com',
        },
      }),
      queryStringParameters: null,
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

  it('should return 404 if the package is not found', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handlePackageUpdate).mockResolvedValue({
      statusCode: 404,
      headers: {},
      body: JSON.stringify({ error: 'Package not found' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/nonexistentPackage',
      headers: validHeaders,
      pathParameters: { id: 'nonexistentPackage' },
      body: JSON.stringify({
        metadata: {
          Name: 'nonexistentPackage',
          Version: '1.0.1',
          ID: 'nonexistentPackage',
        },
        data: {
          Content: 'example content',
          JSProgram: 'console.log("Hello, world!");',
          URL: 'https://example.com',
        },
      }),
      queryStringParameters: null,
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
    expect(responseBody.error).toBe('Package not found');
  });
});