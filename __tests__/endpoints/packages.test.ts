import { describe, it, expect } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('/packages endpoint', () => {
  const headers = { 'X-Authorization': 'Bearer token' };

  it('should return a list of packages with a 200 status', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers,
      body: JSON.stringify([
        { Name: 'Underscore', Version: '1.2.3' },
        { Name: 'Lodash', Version: '1.2.3' },
        { Name: 'React', Version: '1.2.3' },
      ]),
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
      { Version: '1.2.3', Name: 'Lodash', ID: 'lodash' },
      { Version: '1.2.3', Name: 'React', ID: 'react' },
    ]);
    expect(result.headers?.offset).toBe('3');
  });

  it('should return a 400 status for malformed request', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers,
      body: JSON.stringify([{ Name: 'InvalidPackage' }]),
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
      path: '/packages',
      headers: {},
      body: JSON.stringify([{ Name: 'Underscore', Version: '1.2.3' }]),
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

  it('should return a 413 status when too many packages are returned', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/packages',
      headers,
      body: JSON.stringify([{ Name: '*' }]),
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

    expect(result.statusCode).toBe(413);
  });
});
