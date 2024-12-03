// Test /package/{id}/rate (GET) endpoint

import { describe, it, expect, beforeAll } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';

let validAuthToken: string;

beforeAll(async () => {
  const authEvent: APIGatewayProxyEvent = {
    httpMethod: 'PUT',
    path: '/authenticate',
    headers: {},
    body: JSON.stringify({
      User: {
        name: 'testadminuser',
        isAdmin: true
      },
      Secret: {
        password: 'supersecretpassword'
      }
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

  const authResult = await handler(authEvent);
  validAuthToken = JSON.parse(authResult.body);

  // Also need to create a package to rate
});

describe('/package/{id}/rate endpoint', () => {
  const invalidHeaders = { 'X-Authorization': 'invalid-auth-token' };

  it('should return the package rating for a valid ID', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/underscore/rate',
      headers: { 'X-Authorization': validAuthToken },
      pathParameters: { id: 'underscore' },
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
    expect(responseBody).toHaveProperty('PackageRating');
  });

  it('should return 400 if the package ID is missing', async () => {
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
      path: '/package/underscore/rate',
      headers: invalidHeaders,
      pathParameters: { id: 'underscore' },
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
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/nonexistent/rate',
      headers: { 'X-Authorization': validAuthToken },
      pathParameters: { id: 'nonexistent' },
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
  });
});