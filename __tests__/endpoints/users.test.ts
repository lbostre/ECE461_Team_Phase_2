// __tests__/endpoints/users_post.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../index';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken, registerUser, handleGetUser } from '../../src/util/authUtil';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken and registerUser functions
vi.mock('../../src/util/authUtil', async () => {
  const originalModule = await vi.importActual<typeof import('../../src/util/authUtil')>('../../src/util/authUtil');
  return {
    ...originalModule,
    validateToken: vi.fn(),
    registerUser: vi.fn(),
    handleGetUser: vi.fn(),
  };
});

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

const validAuthToken = 'valid-auth-token';
const invalidAuthToken = 'invalid-auth-token';

describe('/users POST endpoint', () => {
  it('should register a user successfully', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(registerUser).mockResolvedValue({
      statusCode: 201,
      headers: {},
      body: JSON.stringify({ message: 'User registered successfully.' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/users',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        name: 'newuser',
        password: 'password',
        isAdmin: false,
        permissions: [],
        group: 'group',
      }),
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

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.message).toBe('User registered successfully.');
  });

  it('should return 403 if the authentication token is missing or invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: false });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/users',
      headers: { 'X-Authorization': invalidAuthToken },
      body: JSON.stringify({
        name: 'newuser',
        password: 'password',
        isAdmin: false,
        permissions: [],
        group: 'group',
      }),
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

  it('should return 403 if the user is not authorized to register a new user', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(registerUser).mockResolvedValue({
      statusCode: 403,
      headers: {},
      body: JSON.stringify({ error: 'Only admins can register users.' }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/users',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        name: 'newuser',
        password: 'password',
        isAdmin: false,
        permissions: [],
        group: 'group',
      }),
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
    expect(responseBody.error).toBe('Only admins can register users.');
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

describe('/users GET endpoint', () => {
  it('should return the user data successfully', async () => {
    vi.mocked(handleGetUser).mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: JSON.stringify({
        User: {
          name: 'testuser',
          isAdmin: true,
          permissions: ['read', 'write'],
          group: 'testgroup',
        },
      }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/users',
      headers: { 'X-Authorization': validAuthToken },
      queryStringParameters: null,
      pathParameters: null,
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
    expect(responseBody.User).toEqual({
      name: 'testuser',
      isAdmin: true,
      permissions: ['read', 'write'],
      group: 'testgroup',
    });
  });

  it('should return 403 if the authentication token is missing or invalid', async () => {
    vi.mocked(handleGetUser).mockResolvedValue({
      statusCode: 403,
      headers: {},
      body: JSON.stringify({
        error: 'Authentication failed due to invalid or missing AuthenticationToken.',
      }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/users',
      headers: { 'X-Authorization': invalidAuthToken },
      queryStringParameters: null,
      pathParameters: null,
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