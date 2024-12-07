// __tests__/endpoints/options.test.ts

import { describe, it, expect } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../../index';

describe('OPTIONS HTTP method handling', () => {
  it('should return 200 with correct headers and empty body for OPTIONS request', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'OPTIONS',
      path: '/any-path',
      headers: {},
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
    expect(result.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
    });
    expect(result.body).toBe('');
  });
});