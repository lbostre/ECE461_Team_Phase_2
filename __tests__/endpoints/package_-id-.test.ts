// Test /package/{id} (GET, POST)

import { describe, it, expect } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { ControlCatalog } from 'aws-sdk';

const content_string = "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"

describe('/package/{id} endpoint', () => {
  const validHeaders = { 'X-Authorization': 'valid-auth-token' };
  const invalidHeaders = { 'X-Authorization': 'invalid-auth-token' };

  it('should return the package data for a valid ID', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/underscore',
      headers: validHeaders,
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
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID', 'underscore');
  });

  it('should return 400 if the package ID is invalid', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/package/invalid-id',
      headers: validHeaders,
      pathParameters: { id: 'invalid-id' },
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
      path: '/package/underscore',
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
      path: '/package/nonexistent',
      headers: validHeaders,
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

  it('should update the package version for a valid ID', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/underscore',
      headers: validHeaders,
      pathParameters: { id: 'underscore' },
      body: JSON.stringify({
        metadata: {
          Name: 'Underscore',
          Version: '1.0.1',
          ID: 'underscore'
        },
        data: {
          Content: content_string,
          JSProgram: `
            if (process.argv.length === 7) {
              console.log('Success')
              process.exit(0)
            } else {
              console.log('Failed')
              process.exit(1)
            }
          `
        }
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
  });

  it('should return 400 if the package ID is invalid during update', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/invalid-id',
      headers: validHeaders,
      pathParameters: { id: 'invalid-id' },
      body: JSON.stringify({
        metadata: {
          Name: 'Invalid',
          Version: '1.0.1',
          ID: 'invalid-id'
        },
        data: {
          Content: content_string,
          JSProgram: `
            if (process.argv.length === 7) {
              console.log('Success')
              process.exit(0)
            } else {
              console.log('Failed')
              process.exit(1)
            }
          `
        }
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

    expect(result.statusCode).toBe(400);
  });

  it('should return 403 if authentication token is missing or invalid during update', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/underscore',
      headers: invalidHeaders,
      pathParameters: { id: 'underscore' },
      body: JSON.stringify({
        metadata: {
          Name: 'Underscore',
          Version: '1.0.1',
          ID: 'underscore'
        },
        data: {
          Content: content_string,
          JSProgram: `
            if (process.argv.length === 7) {
              console.log('Success')
              process.exit(0)
            } else {
              console.log('Failed')
              process.exit(1)
            }
          `
        }
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
  });

  it('should return 404 if the package does not exist during update', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package/nonexistent',
      headers: validHeaders,
      pathParameters: { id: 'nonexistent' },
      body: JSON.stringify({
        metadata: {
          Name: 'Nonexistent',
          Version: '1.0.1',
          ID: 'nonexistent'
        },
        data: {
          Content: content_string,
          JSProgram: `
            if (process.argv.length === 7) {
              console.log('Success')
              process.exit(0)
            } else {
              console.log('Failed')
              process.exit(1)
            }
          `
        }
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
  });
});