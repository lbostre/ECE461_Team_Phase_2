// Test /tracks (GET) endpoint

import { describe, it, expect } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('/tracks endpoint', () => {
  it('should return the list of planned tracks with a 200 status', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/tracks',
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
    expect(JSON.parse(result.body)).toEqual({
      plannedTracks: ['Access control track'],
    });
  });

  it('should return 500 if there is an internal server error', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'GET',
      path: '/tracks',
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

    // Temporarily override console.error to suppress error logging
    const originalConsoleError = console.error;
    console.error = () => {};

    // Call the handler and expect a 500 response
    const result = await handler(event);

    // Restore console.error
    console.error = originalConsoleError;

    expect(result.statusCode).toBe(500);
    expect(result.body).toBe('The system encountered an error while retrieving the student\'s track information.');
  });
});