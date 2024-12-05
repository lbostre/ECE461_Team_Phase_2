// Test /package/{id}/cost (GET) endpoint

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
        name: 'testuser',
        isAdmin: true
      },
      Secret: {
        password: 'securepassword'
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

  // Also need to create a package to find cost
});

describe('/package/{id}/cost endpoint', () => {
  const invalidHeaders = { 'X-Authorization': 'invalid-auth-token' };

  it('should return the package cost for a valid ID without dependencies', async () => {
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

  it('should return the package cost for a valid ID with dependencies', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/357898765/cost',
      headers: { 'X-Authorization': validAuthToken },
      pathParameters: { id: '357898765' },
      queryStringParameters: { dependency: 'true' },
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
    expect(responseBody['357898765']).toHaveProperty('standaloneCost', 50.0);
    expect(responseBody['357898765']).toHaveProperty('totalCost', 95.0);
    expect(responseBody).toHaveProperty('988645763');
    expect(responseBody['988645763']).toHaveProperty('standaloneCost', 20.0);
    expect(responseBody['988645763']).toHaveProperty('totalCost', 45.0);
  });

  it('should return 400 if the package ID is missing', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package//cost',
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
});