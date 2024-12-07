// __tests__/util/package/handlePackageUpdate.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackageUpdate } from '../../../src/package';
import { validateToken, getUserInfo, getGroups } from '../../../src/util/authUtil';
import {
  uploadToS3,
  extractVersionFromPackageJson,
  extractPackageJsonUrl,
  createPackageService,
  getRepositoryVersion,
  performDebloat,
} from '../../../src/util/packageUtils';
import { getRepoData } from '../../../src/main';

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the validateToken and getUserInfo functions
vi.mock('../../../src/util/authUtil', () => ({
  validateToken: vi.fn(),
  getUserInfo: vi.fn(),
  getGroups: vi.fn(),
}));

// Mock the utility functions
vi.mock('../../../src/util/packageUtils', async () => {
  const original = await vi.importActual('../../../src/util/packageUtils');
  return {
    ...original,
    uploadToS3: vi.fn(),
    extractVersionFromPackageJson: vi.fn(),
    extractPackageJsonUrl: vi.fn(),
    createPackageService: vi.fn(),
    getRepositoryVersion: vi.fn(),
    performDebloat: vi.fn(),
  };
});

// Mock the getRepoData function
vi.mock('../../../src/main', () => ({
  getRepoData: vi.fn(),
}));

beforeEach(() => {
  s3Mock.reset();
  ddbMock.reset();
  vi.clearAllMocks();
});

describe('handlePackageUpdate', () => {
  const validAuthToken = 'valid-auth-token';
  const headers = { 'X-Authorization': validAuthToken };

  const validRepoData = {
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
  };
  const invalidRepoData = {
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
    NetScore: 0.45,              
    NetScoreLatency: 250,      
  };

  const mockPackageData = {
    metadata: {
      ID: 'examplePackage123',
      Version: '1.0.1',
    },
    data: {
      Content: 'example content',
      JSProgram: 'console.log("Hello, world!");',
      URL: 'https://example.com',
    },
    Secret: false,
  };

  const mockDynamoResponse = {
    Item: {
      ECEfoursixone: 'examplePackage123',
      Version: '1.0.0',
    },
  };

  beforeEach(() => {
    s3Mock.reset();
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should update the package successfully', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves(mockDynamoResponse);
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(getRepoData).mockResolvedValue(validRepoData);
    vi.mocked(getUserInfo).mockResolvedValue({ username: 'test-user', isAdmin: false });

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageData),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('message', 'Version is updated.');
    expect(uploadToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('should create a package successfully using content string and debloat', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves(mockDynamoResponse);
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(extractVersionFromPackageJson).mockResolvedValue('1.0.0');
    vi.mocked(extractPackageJsonUrl).mockResolvedValue('https://github.com/jashkenas/underscore');
    vi.mocked(getRepoData).mockResolvedValue(validRepoData);
    vi.mocked(createPackageService).mockResolvedValue({
      metadata: {
        Name: "Underscore",
        Version: "1.0.0",
        ID: "underscore"
      },
      data: {
        Content: 'example content',
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
    vi.mocked(getUserInfo).mockResolvedValue({ username: 'test-user', isAdmin: false });
    vi.mocked(performDebloat).mockResolvedValue('debloated-content');

    const mockPackageDataContentDebloat = {
      ...mockPackageData,
      debloat: true,
    };

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageDataContentDebloat),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('message', 'Version is updated.');
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('should handle failed debloat properly', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(performDebloat).mockRejectedValue(new Error('Failed to debloat'));

    const mockPackageDataContentDebloat = {
      ...mockPackageData,
      debloat: true,
    };

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageDataContentDebloat),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'An error occurred while processing the request');
  });

  it('should return 400 if the request body is missing', async () => {
    const result = await handlePackageUpdate(
      'examplePackage123',
      '',
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('There is missing field(s) in the request body.');
  });

  it('should return 400 if the request body contains invalid JSON', async () => {
    const result = await handlePackageUpdate(
      'examplePackage123',
      'invalid-json',
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Invalid JSON in request body.');
  });

  it('should return 400 if there are missing fields in the request body', async () => {
    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify({}),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('There is missing field(s) in the PackageID or it is formed improperly.');
  });

  it('should return 404 if the package does not exist', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageData),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package does not exist.');
  });

  it('should handle internal server errors gracefully', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageData),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');
  });
  
  it('should return 424 if the package rating is disqualified', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves(mockDynamoResponse);
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(getRepoData).mockResolvedValue(invalidRepoData);
    vi.mocked(getUserInfo).mockResolvedValue({ username: 'test-user', isAdmin: false });

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageData),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(424);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package is not uploaded due to the disqualified rating.');
  });

  it('should return 403 if user group could not be retrieved when Secret is true', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(getGroups).mockResolvedValue(undefined); // Simulate user group not being retrieved
    ddbMock.on(GetCommand).resolves(mockDynamoResponse);

    const mockPackageDataWithSecret = {
      ...mockPackageData,
      Secret: true,
    };

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageDataWithSecret),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(403);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('User group could not be retrieved');
  });

  it('should handle Secret flag and retrieve user group successfully', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(getGroups).mockResolvedValue('test-group'); // Simulate user group being retrieved
    ddbMock.on(GetCommand).resolves(mockDynamoResponse);
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(getRepoData).mockResolvedValue(validRepoData);
    vi.mocked(getUserInfo).mockResolvedValue({ username: 'test-user', isAdmin: false });

    const mockPackageDataWithSecret = {
      ...mockPackageData,
      Secret: true,
    };

    const result = await handlePackageUpdate(
      'examplePackage123',
      JSON.stringify(mockPackageData),
      ddbMock as unknown as DynamoDBDocumentClient,
      s3Mock as unknown as S3Client,
      validAuthToken
    );

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('message', 'Version is updated.');
    expect(uploadToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });
});