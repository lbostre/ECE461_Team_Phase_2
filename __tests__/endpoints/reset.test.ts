import { describe, it, expect } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('/reset endpoint', () => {
  const validHeaders = { 'X-Authorization': 'valid-auth-token' };
  const invalidHeaders = { 'X-Authorization': 'invalid-auth-token' };

  it('should reset the registry and return 200 status code', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'DELETE',
      path: '/reset',
      headers: validHeaders,
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
    expect(result.body).toBe('Registry is reset.');
  });

  it('should return 401 if the user does not have permission to reset the registry', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'DELETE',
      path: '/reset',
      headers: validHeaders,
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

    // Mock user permissions to simulate lack of permission
    // For example, set a variable or mock a function that checks permissions

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
    expect(result.body).toBe('You do not have permission to reset the registry.');
  });

  it('should return 403 if authentication token is missing or invalid', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'DELETE',
      path: '/reset',
      headers: {}, // No authentication token provided
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
    expect(result.body).toBe('Authentication failed due to invalid or missing AuthenticationToken.');
  });
});