// Test /package (POST) endpoint

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken } from '../../src/util/authUtil';
import { getRepoData } from '../../src/main';
// import { uploadGithubRepoAsZipToS3, getRepositoryVersion } from '../../src/util/packageUtils';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const content_string = "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"

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock the validateToken function
vi.mock('../../src/util/authUtil', () => ({
  validateToken: vi.fn(),
}));

// Mock the getRepoData function from main.ts
vi.mock('../../src/main', () => ({
  getRepoData: vi.fn(),
}));

beforeEach(() => {
  ddbMock.reset();
  s3Mock.reset();
});

describe('/package POST endpoint', () => {
  const validAuthToken = 'valid-auth-token';
  const invalidHeaders = {};

  it('should create a package with Content', async () => {
    // Mock the validateToken function to return true for valid tokens
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock dynamoDB GetCommand to return a predefined response for a new package
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        Content: content_string,
        JSProgram: `
          if (process.argv.length === 7) {
            console.log('Success')
            process.exit(0)
          } else {
            console.log('Failed')
            process.exit(1)
          }
        `,
        debloat: false,
        Name: 'cool-package',
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

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID');
  }, 10000); // Change the timeout here (in milliseconds)

  it('should create a package with URL', async () => {
    // Mock the validateToken function to return true for valid tokens
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock dynamoDB GetCommand to return a predefined response for a new package
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    // Use getRepoData mock to return a valid response
    vi.mocked(getRepoData).mockResolvedValue({
      BusFactor: 0.8,
      BusFactor_Latency: 100,
      Correctness: 0.9,
      Correctness_Latency: 150,
      RampUp: 0.7,
      RampUp_Latency: 120,
      ResponsiveMaintainer: 0.85,
      ResponsiveMaintainer_Latency: 110,
      License: 1.0,
      License_Latency: 90,
      NetScore: 0.88,
      NetScore_Latency: 200,
    });
    
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        JSProgram: `
          if (process.argv.length === 7) {
            console.log('Success')
            process.exit(0)
          } else {
            console.log('Failed')
            process.exit(1)
          }
        `,
        URL: 'https://github.com/jashkenas/underscore',
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

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID');
  }, 60000); // 60-second timeout


  it('should return 400 if both Content and URL are provided', async () => {
    // Mock the validateToken function to return true for valid tokens
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        Content: 'UEsDBAoAAAAAACAfUFkAAAAAAAAAAAAAAAASAAkAdW5kZXJzY29yZS1t...',
        URL: 'https://github.com/jashkenas/underscore',
        JSProgram: `
          if (process.argv.length === 7) {
            console.log('Success')
            process.exit(0)
          } else {
            console.log('Failed')
            process.exit(1)
          }
        `,
        Name: 'cool-package',
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

  it('should return 403 if authentication token is missing', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: {}, // No authentication token provided
      body: JSON.stringify({
        Content: 'UEsDBAoAAAAAACAfUFkAAAAAAAAAAAAAAAASAAkAdW5kZXJzY29yZS1t...',
        JSProgram: `
          if (process.argv.length === 7) {
            console.log('Success')
            process.exit(0)
          } else {
            console.log('Failed')
            process.exit(1)
          }
        `,
        Name: 'cool-package',
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

    expect(result.statusCode).toBe(403);
  });

  it('should return 409 if package already exists', async () => {
    // Mock the validateToken function to return true for valid tokens
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock a response with an Item for an existing package
    ddbMock.on(GetCommand).resolves({
      Item: {
      packageID: '357898765',
      standaloneCost: 50.0,
      totalCost: 95.0,
      dependencies: {
        '988645763': {
        standaloneCost: 20.0,
        totalCost: 45.0,
        },
      },
      },
    });

    // Request should fail with 409
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        Content: content_string,
        JSProgram: `
          if (process.argv.length === 7) {
            console.log('Success')
            process.exit(0)
          } else {
            console.log('Failed')
            process.exit(1)
          }
        `,
        Name: 'cool-package',
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

    expect(result.statusCode).toBe(409);
  });

  it('should return 424 if package rating is disqualified', async () => {
    // Mock the validateToken function to return true for valid tokens
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    // Mock dynamoDB GetCommand to return a predefined response for a new package
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    // Use getRepoData mock to return a valid response
    vi.mocked(getRepoData).mockResolvedValue({
      BusFactor: 0.1,
      BusFactor_Latency: 100,
      Correctness: 0.2,
      Correctness_Latency: 150,
      RampUp: 0.1,
      RampUp_Latency: 120,
      ResponsiveMaintainer: 0.2,
      ResponsiveMaintainer_Latency: 110,
      License: 0.1,
      License_Latency: 90,
      NetScore: 0.15,
      NetScore_Latency: 200,
    });
    
    // Assuming dependency injection or a mocking library is used
    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: { 'X-Authorization': validAuthToken },
      body: JSON.stringify({
        // NEED TO ADD LOW RATED REPO
        URL: 'https://github.com/jashkenas/underscore',
        JSProgram: `
          if (process.argv.length === 7) {
            console.log('Success')
            process.exit(0)
          } else {
            console.log('Failed')
            process.exit(1)
          }
        `,
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

    expect(result.statusCode).toBe(424);
  });
});

