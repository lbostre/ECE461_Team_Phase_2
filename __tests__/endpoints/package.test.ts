// Test /package (POST) endpoint

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler } from '../../index';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { validateToken, getUserInfo } from '../../src/util/authUtil';
import { getRepoData } from '../../src/main';
import { S3Client } from '@aws-sdk/client-s3';
import {
  uploadToS3,
  extractVersionFromPackageJson,
  extractPackageJsonUrl,
  createPackageService,
  uploadGithubRepoAsZipToS3,
} from '../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock the validateToken function
vi.mock('../../src/util/authUtil', () => ({
  validateToken: vi.fn(),
  getUserInfo: vi.fn(),
}));

// Mock the utility functions
vi.mock('../../src/util/packageUtils', async () => {
  const original = await vi.importActual('../../src/util/packageUtils');
  return {
    ...original,
    uploadToS3: vi.fn(),
    extractVersionFromPackageJson: vi.fn(),
    extractPackageJsonUrl: vi.fn(),
    createPackageService: vi.fn(),
    uploadGithubRepoAsZipToS3: vi.fn(),
  };
});

// Mock the getRepoData function
vi.mock('../../src/main', () => ({
  getRepoData: vi.fn(),
}));

beforeEach(() => {
  ddbMock.reset();
  s3Mock.reset();
  vi.clearAllMocks();
});

describe('/package POST endpoint', () => {
  const validAuthToken = 'valid-auth-token';
  const headers = { 'X-Authorization': validAuthToken };

  const mockPackageDataUrl = {
    metadata: {
      Name: "Underscore",
      Version: "1.0.0",
      ID: "underscore",
    },
    URL: "https://github.com/jashkenas/underscore",
    debloat: false,
    Name: 'underscore',
  };

  it('should create a package successfully using URL', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(getUserInfo).mockResolvedValue({ username: 'ECEfoursixone' });
    vi.mocked(uploadGithubRepoAsZipToS3).mockResolvedValue('s3-url');
    vi.mocked(getRepoData).mockResolvedValue({
      BusFactor: 0.8,             
      BusFactorLatency: 100,     
      Correctness: 0.9,           
      CorrectnessLatency: 150,   
      RampUp: 0.7,                
      RampUpLatency: 200,        
      ResponsiveMaintainer: 0.85, 
      ResponsiveMaintainerLatency: 120, 
      LicenseScore: 0.95,              
      LicenseScoreLatency: 80,        
      GoodPinningPractice: 0.9,
      GoodPinningPracticeLatency: 110,
      PullRequest: 0.75,
      PullRequestLatency: 130,
      NetScore: 0.88,              
      NetScoreLatency: 250,      
    });
    vi.mocked(createPackageService).mockResolvedValue({
      metadata: {
        Name: "Underscore",
        Version: "1.0.0",
        ID: "underscore"
      },
      data: {
        URL: "https://github.com/jashkenas/underscore",
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
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers,
      body: JSON.stringify(mockPackageDataUrl),
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
    expect(uploadGithubRepoAsZipToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(2);
  });

  it('should return 400 if the request body is missing', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers,
      body: null,
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
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Request body is missing');
  });

  it('should return 400 if the request body contains invalid JSON', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers,
      body: 'invalid-json',
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
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Invalid JSON in request body.');
  });

  it('should return 403 if the authentication token is invalid', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: false });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers: { 'X-Authorization': 'invalid-auth-token' },
      body: JSON.stringify(mockPackageDataUrl),
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
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Authentication failed due to invalid or missing AuthenticationToken.');
  });

  it('should return 409 if the package already exists', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({
      Item: {
        ECEfoursixone: 'underscore',
        Version: '1.0.0',
      },
    });

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers,
      body: JSON.stringify(mockPackageDataUrl),
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
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package already exists.');
  });

  it('should return 500 if there is an internal server error', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

    const event: APIGatewayProxyEvent = {
      httpMethod: 'POST',
      path: '/package',
      headers,
      body: JSON.stringify(mockPackageDataUrl),
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

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('An error occurred while processing the request');
  });
});