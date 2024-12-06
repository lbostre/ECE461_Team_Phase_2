// __tests__/endpoints/reset.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../index';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken, handleReset } from '../../src/util/authUtil';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken and handleReset functions
vi.mock('../../src/util/authUtil', async () => {
  const originalModule = await vi.importActual<typeof import('../../src/util/authUtil')>('../../src/util/authUtil');
  return {
    ...originalModule,
    validateToken: vi.fn(),
    handleReset: vi.fn(),
  };
});

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

const validAuthToken = 'valid-auth-token';
const invalidAuthToken = 'invalid-auth-token';
const headers = { 'X-Authorization': validAuthToken };
const invalidHeaders = { 'X-Authorization': invalidAuthToken };
const tableName = 'ECE461_UsersTable';

describe('/reset endpoint', () => {
  it('should reset the user data for a valid token', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handleReset).mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({ message: 'Registry is reset.' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'DELETE',
      path: '/reset',
      headers,
      body: null,
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

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.message).toBe('Registry is reset.');
  });

  it('should return 403 if the token is invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: false });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'DELETE',
      path: '/reset',
      headers: invalidHeaders,
      body: null,
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

  it('should return 500 if there is an internal server error', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(handleReset).mockRejectedValue(new Error('Internal Server Error'));

    const event: APIGatewayProxyEvent = {
      httpMethod: 'DELETE',
      path: '/reset',
      headers,
      body: null,
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

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');
  });
});