// __tests__/endpoints/package_byRegEx.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../index';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { extractAndValidateToken } from '../../src/util/authUtil';
import { handlePackageByRegEx } from '../../src/package';
import jwt from 'jsonwebtoken';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the extractAndValidateToken function
vi.mock('../../src/util/authUtil', async () => {
  const originalModule = await vi.importActual<typeof import('../../src/util/authUtil')>('../../src/util/authUtil');
  return {
    ...originalModule,
    extractAndValidateToken: vi.fn(),
  };
});

// Mock the handlePackageByRegEx function
vi.mock('../../src/package', async () => {
  const originalModule = await vi.importActual<typeof import('../../src/package')>('../../src/package');
  return {
    ...originalModule,
    handlePackageByRegEx: vi.fn(),
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

describe('/package/byRegEx POST endpoint', () => {
  it('should return a list of packages matching the regex with a 200 status', async () => {
    vi.mocked(extractAndValidateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handlePackageByRegEx).mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: JSON.stringify([
        { Version: '1.2.3', Name: 'Underscore', ID: 'underscore123' },
        { Version: '1.3.3', Name: 'Underscore', ID: 'underscore133' },
      ]),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/byRegEx',
      headers: validHeaders,
      body: JSON.stringify({ RegEx: '.*?Underscore.*' }),
      queryStringParameters: null,
      pathParameters: null,
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    // Mock the GetCommand to return a valid user item
    ddbMock.on(GetCommand).resolves({
      Item: {
        username: 'testuser',
        callCount: 10,
        expiresAt: Math.floor(Date.now() / 1000) + 3600, // Token unexpired
        permissions: ['search'],
      },
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(2);
    expect(responseBody[0]).toHaveProperty('ID', 'underscore123');
    expect(responseBody[0]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[0]).toHaveProperty('Version', '1.2.3');
    expect(responseBody[1]).toHaveProperty('ID', 'underscore133');
    expect(responseBody[1]).toHaveProperty('Name', 'Underscore');
    expect(responseBody[1]).toHaveProperty('Version', '1.3.3');
  });

  it('should return a 403 status for missing or invalid authentication token', async () => {
    vi.mocked(extractAndValidateToken).mockResolvedValue({ isValid: false });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/byRegEx',
      headers: invalidHeaders,
      body: JSON.stringify({ RegEx: '.*?Underscore.*' }),
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
    expect(responseBody.error).toBe('Authentication failed due to invalid or missing AuthenticationToken.');
  });

  it('should return a 404 status when no package is found under the regex', async () => {
    vi.mocked(extractAndValidateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handlePackageByRegEx).mockResolvedValue({
      statusCode: 404,
      headers: {},
      body: JSON.stringify({ error: 'No package found under this regex.' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/byRegEx',
      headers: validHeaders,
      body: JSON.stringify({ RegEx: '^NonExistentPackage$' }),
      queryStringParameters: null,
      pathParameters: null,
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
    };

    // Mock the GetCommand to return a valid user item
    ddbMock.on(GetCommand).resolves({
      Item: {
        username: 'testuser',
        callCount: 10,
        expiresAt: Math.floor(Date.now() / 1000) + 3600, // Token unexpired
        permissions: ['search'],
      },
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('No package found under this regex.');
  });
});