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
import { validateToken, getUserInfo } from '../../../src/util/authUtil';
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
    BusFactor: 0.8,             // Bus factor score
    BusFactor_Latency: 100,     // Latency time for bus factor calculation
    Correctness: 0.9,           // Correctness score
    Correctness_Latency: 150,   // Latency time for correctness calculation
    RampUp: 0.7,                // Ramp-up time score
    RampUp_Latency: 200,        // Latency time for ramp-up score calculation
    ResponsiveMaintainer: 0.85, // Responsiveness score
    ResponsiveMaintainer_Latency: 120, // Latency time for responsiveness calculation
    License: 0.95,              // License compatibility score
    License_Latency: 80,        // Latency time for license compatibility calculation
    NetScore: 0.88,             // Overall score
    NetScore_Latency: 250,      // Latency time for score calculation
  };
  const invalidRepoData = {
    BusFactor: 0.8,             // Bus factor score
    BusFactor_Latency: 100,     // Latency time for bus factor calculation
    Correctness: 0.9,           // Correctness score
    Correctness_Latency: 150,   // Latency time for correctness calculation
    RampUp: 0.7,                // Ramp-up time score
    RampUp_Latency: 200,        // Latency time for ramp-up score calculation
    ResponsiveMaintainer: 0.85, // Responsiveness score
    ResponsiveMaintainer_Latency: 120, // Latency time for responsiveness calculation
    License: 0.95,              // License compatibility score
    License_Latency: 80,        // Latency time for license compatibility calculation
    NetScore: 0.45,             // Overall score
    NetScore_Latency: 250,      // Latency time for score calculation
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
});