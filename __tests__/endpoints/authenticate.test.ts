// Test /authenticate (PUT) endpoint

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handleAuthenticate, validateToken } from '../../src/util/authUtil';
import { handler } from '../../index';

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';
process.env.JWT_SECRET = 'test-secret';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

// Mock the handleAuthenticate and validateToken functions
vi.mock('../../src/util/authUtil', () => ({
  handleAuthenticate: vi.fn(),
  validateToken: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/authenticate endpoint', () => {
  const validAuthToken = 'valid-auth-token';

  it('should return an authentication token for valid credentials', async () => {
    vi.mocked(handleAuthenticate).mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ token: `bearer ${validAuthToken}` }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'PUT',
      path: '/authenticate',
      headers: {},
      body: JSON.stringify({
        User: {
          name: 'testuser',
          isAdmin: true,
        },
        Secret: {
          password: 'supersecretpassword',
        },
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
    expect(responseBody.token).toBe(`bearer ${validAuthToken}`);
  });

  it('should return 400 if the request body is missing fields', async () => {
    vi.mocked(handleAuthenticate).mockResolvedValue({
      statusCode: 400,
      body: JSON.stringify({
        error: "There is missing field(s) in the AuthenticationRequest or it is formed improperly.",
      }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'PUT',
      path: '/authenticate',
      headers: {},
      body: JSON.stringify({
        User: {
          // Missing name field
          isAdmin: true,
        },
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
    vi.mocked(handleAuthenticate).mockResolvedValue({
      statusCode: 401,
      body: JSON.stringify({ error: "The username or password is invalid." }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'PUT',
      path: '/authenticate',
      headers: {},
      body: JSON.stringify({
        User: {
          name: 'testuser',
          isAdmin: true,
        },
        Secret: {
          password: 'wrongpassword',
        },
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

  it('should return 501 if the system does not support authentication', async () => {
    vi.mocked(handleAuthenticate).mockResolvedValue({
      statusCode: 501,
      body: JSON.stringify({ error: "Not implemented" }),
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'PUT',
      path: '/authenticate',
      headers: {},
      body: JSON.stringify({
        User: {
          name: 'testuser',
          isAdmin: true,
        },
        Secret: {
          password: 'supersecretpassword',
        },
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

    expect(result.statusCode).toBe(501);
  });
});

