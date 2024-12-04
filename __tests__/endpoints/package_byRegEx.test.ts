// Test the /package/byRegEx endpoint

import { describe, it, expect } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('/package/byRegEx endpoint', () => {
  const validHeaders = { 'X-Authorization': 'Bearer valid-auth-token' };
  const invalidHeaders = { 'X-Authorization': 'Bearer invalid-auth-token' };

  it('should return a list of packages matching the regex with a 200 status', async () => {
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

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([
      { Version: '1.2.3', Name: 'Underscore', ID: 'underscore' },
      { Version: '2.1.0', Name: 'Lodash', ID: 'lodash' },
      { Version: '1.2.0', Name: 'React', ID: 'react' },
    ]);
  });

  it('should return a 400 status for malformed request', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/byRegEx',
      headers: validHeaders,
      body: JSON.stringify({}), // Missing 'RegEx' field
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
  });

  it('should return a 403 status for missing or invalid authentication token', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/byRegEx',
      headers: {}, // Missing 'X-Authorization'
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
  });

  it('should return a 404 status when no package is found under the regex', async () => {
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

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
  });
});