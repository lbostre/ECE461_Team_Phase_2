// Test /authenticate (PUT) endpoint

import { describe, it, expect } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';

describe('/authenticate PUT endpoint', () => {  

  it('should return an authentication token for valid credentials', async () => {
    const event: APIGatewayProxyEvent = {
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

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    // Update the expected token value
    // expect(responseBody).toBe("example-token");
  }, 30000);

  it('should return 400 if the request body is missing fields', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'PUT',
      path: '/authenticate',
      headers: {},
      body: JSON.stringify({
        User: {
          name: 'testuser'
        }
        // Missing Secret field
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

    expect(result.statusCode).toBe(400);
  });

  it('should return 401 if the credentials are invalid', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'PUT',
      path: '/authenticate',
      headers: {},
      body: JSON.stringify({
        User: {
          name: 'testuser',
          isAdmin: true
        },
        Secret: {
          password: 'notthesupersecretpassword'
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

    const result = await handler(event);

    expect(result.statusCode).toBe(401);
  });
});