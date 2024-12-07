// __tests__/util/package/handlePackagePost.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackagePost } from '../../../src/package';
import { validateToken, getUserInfo, getGroups } from '../../../src/util/authUtil';
import {
  uploadToS3,
  extractVersionFromPackageJson,
  extractPackageJsonUrl,
  createPackageService,
  getRepositoryVersion,
} from '../../../src/util/packageUtils';
import { getRepoData } from '../../../src/main';
import { uploadGithubRepoAsZipToS3, performDebloat } from '../../../src/util/packageUtils';

const contentString = "UEsDBBQAAAAAAA9DQlMAAAAAAAAAAAAAAAALACAAZXhjZXB0aW9ucy9VVA0AB35PWGF+T1hhfk9YYXV4CwABBPcBAAAEFAAAAFBLAwQUAAgACACqMCJTAAAAAAAAAABNAQAAJAAgAGV4Y2VwdGlvbnMvQ29tbWNvdXJpZXJFeGNlcHRpb24uamF2YVVUDQAH4KEwYeGhMGHgoTBhdXgLAAEE9wEAAAQUAAAAdY7NCoMwDMfvfYoct0tfQAYDGbv7BrVmW9DaksQhDN99BSc65gKBwP/jl+R86+4IPgabN/g4MCFbHD0mpdhLYQyFFFl/PIyijpVuzqvYCiVlO5axwWKJdDHUsbVXVEXOTef5MmmoO/LgOycC5dp5WbCAo2LfCFRDrxRwFV7GQJ7E9HSKsMUCf/0w+2bSHuPwN3vMFPiMPkjsVoTTHmcyk3kDUEsHCOEX4+uiAAAATQEAAFBLAwQUAAgACACqMCJTAAAAAAAAAAB9AgAAKgAgAGV4Y2VwdGlvbnMvQ29tbWNvdXJpZXJFeGNlcHRpb25NYXBwZXIuamF2YVVUDQAH4KEwYeGhMGHgoTBhdXgLAAEE9wEAAAQUAAAAdVHNTsMwDL7nKXzcJOQXKKCJwYEDAiHxACY1U0bbRI7bVUJ7d7JCtrbbIkVx4u/HdgLZb9owWF9j2rX1rTgW5N5yUOebWBjj6uBFzzDCUUnUfZHViA8U+Z1jSBQurlFadZVTxxEz9CO9jDy21FGPrtmyVXwejmKa20WUmESF8cxujOBe8Sl38UIhsFzFvYnvXHkAmFWOTWg/K2fBVhQjrE9NzEQhaVZcc6MRZqnbS6x7+DEG0lr9tTfEk2mAzGYzoF87FkmFDbf/2jIN1OdwcckTuF9m28Ma/9XRDe6g4d0kt1gWJ5KwttJMi8M2lKRH/CMpLTLgJrnihjUn175Mgllxb/bmF1BLBwiV8DzjBgEAAH0CAABQSwMEFAAIAAgAD0NCUwAAAAAAAAAAGQMAACYAIABleGNlcHRpb25zL0dlbmVyaWNFeGNlcHRpb25NYXBwZXIuamF2YVVUDQAHfk9YYX9PWGF+T1hhdXgLAAEE9wEAAAQUAAAAjVNRa8IwEH7Prwg+VZA87a3bcJsyBhNHx9hzTE+Npk25XG3Z8L8v7ZbaKsICaS6977vvu6QtpNrLDXBlM+FnpmyJGlBAraAgbXMXM6azwiJdYBAcSSS9loqceJQOEnCFp0D8P0qAP9n0OqUkbTRpOME//JuerZ08yFrofAeKxEu7xMNc5QQ6XxRBXDjsI6AmMQ+NL2RRAF7FvaE96LQHMDZb2X2TA8yFM+ubnXhvnt7ptA3YNJBYUa6MVlwZ6Rx/hhxQqzNl7usayCAnx89St93+nn8zxv2Y/jbexoNz4nh2ai16eQBE76Td/ZkJNE42hFEnxKEeB61m9G+7k+B3PIdqkIvG8Ylk7EZ4XYvR6KGpGGpX0nHaoq3y0aQR6lEQqMR82IQoi1RSJzGTJD81bWfgFOq2YhTwE97/xsQ8SZZJIyE2QK9WSaO/IF2Ac/4fiMZB+MiO7AdQSwcIIu3xZlgBAAAZAwAAUEsBAhQDFAAAAAAAD0NCUwAAAAAAAAAAAAAAAAsAIAAAAAAAAAAAAO1BAAAAAGV4Y2VwdGlvbnMvVVQNAAd+T1hhfk9YYX5PWGF1eAsAAQT3AQAABBQAAABQSwECFAMUAAgACACqMCJT4Rfj66IAAABNAQAAJAAgAAAAAAAAAAAApIFJAAAAZXhjZXB0aW9ucy9Db21tY291cmllckV4Y2VwdGlvbi5qYXZhVVQNAAfgoTBh4aEwYeChMGF1eAsAAQT3AQAABBQAAABQSwECFAMUAAgACACqMCJTlfA84wYBAAB9AgAAKgAgAAAAAAAAAAAApIFdAQAAZXhjZXB0aW9ucy9Db21tY291cmllckV4Y2VwdGlvbk1hcHBlci5qYXZhVVQNAAfgoTBh4aEwYeChMGF1eAsAAQT3AQAABBQAAABQSwECFAMUAAgACAAPQ0JTIu3xZlgBAAAZAwAAJgAgAAAAAAAAAAAApIHbAgAAZXhjZXB0aW9ucy9HZW5lcmljRXhjZXB0aW9uTWFwcGVyLmphdmFVVA0AB35PWGF/T1hhfk9YYXV4CwABBPcBAAAEFAAAAFBLBQYAAAAABAAEALcBAACnBAAAAAA="

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
    uploadGithubRepoAsZipToS3: vi.fn(),
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

describe('handlePackagePost', () => {

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
  const validAuthToken = 'valid-auth-token';
  const headers = { 'X-Authorization': validAuthToken };

  const mockPackageDataContent = {
    metadata: {
      Name: "Underscore",
      Version: "1.0.0",
      ID: "underscore",
    },
    Content: contentString,
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
    Name: 'underscore',
  };

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

  beforeEach(() => {
    s3Mock.reset();
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should create a package successfully using content string', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
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
        Content: contentString,
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

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataContent),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );
    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID');
    expect(uploadToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('should create a package successfully using URL', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(getRepoData).mockResolvedValue(validRepoData);
    vi.mocked(getRepositoryVersion).mockResolvedValue('1.0.0');
    vi.mocked(createPackageService).mockResolvedValue({
      metadata: {
      Name: "Underscore",
      Version: "1.0.0",
      ID: "underscore"
      },
        data: {
        Content: contentString,
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
    vi.mocked(uploadGithubRepoAsZipToS3).mockResolvedValue('base64-encoded-zip');

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataUrl),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID');
    expect(uploadGithubRepoAsZipToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('should create a package successfully using NPM URL', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(getRepoData).mockResolvedValue(validRepoData);
    vi.mocked(getRepositoryVersion).mockResolvedValue('1.0.0');
    vi.mocked(createPackageService).mockResolvedValue({
      metadata: {
      Name: "Underscore",
      Version: "1.0.0",
      ID: "underscore"
      },
        data: {
        Content: contentString,
        URL: "https://www.npmjs.com/package/react",
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
    vi.mocked(uploadGithubRepoAsZipToS3).mockResolvedValue('base64-encoded-zip');

    const mockPackageDataUrlNpm = {
      ...mockPackageDataUrl,
      URL: 'https://www.npmjs.com/package/react',
    };

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataUrlNpm),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID');
    expect(uploadGithubRepoAsZipToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('should return 400 error when body is missing', async () => {
    const result = await handlePackagePost(
      '',
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );
    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Request body is missing');
  });

  it('should return 400 error when both content and URL are set', async () => {
    const result = await handlePackagePost(
      JSON.stringify({
        ...mockPackageDataContent,
        URL: 'https://github.com/jashkenas/underscore',
      }),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );
    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Both Content and URL cannot be set');
  });

  it('should create a package successfully using content string and debloat', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
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
        Content: contentString,
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
      ...mockPackageDataContent,
      debloat: true,
    };

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataContentDebloat),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );
    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('metadata');
    expect(responseBody.metadata).toHaveProperty('ID');
    expect(uploadToS3).toHaveBeenCalled();
    expect(ddbMock.commandCalls(PutCommand).length).toBe(1);
  });

  it('should handle failed debloat properly', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    vi.mocked(performDebloat).mockRejectedValue(new Error('Failed to debloat'));

    const mockPackageDataContentDebloat = {
      ...mockPackageDataContent,
      debloat: true,
    };

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataContentDebloat),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );
    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'An error occurred while processing the request');
  });

  it('should return 409 error if package uploaded with content already exists', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: { ID: 'underscore100' } });
    vi.mocked(extractVersionFromPackageJson).mockResolvedValue('1.0.0');
    vi.mocked(extractPackageJsonUrl).mockResolvedValue('https://github.com/jashkenas/underscore');

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataContent),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );

    expect(result.statusCode).toBe(409);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Package already exists.');
  });

  it('should return 409 error if package uploaded with URL already exists', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: { ID: 'underscore' } });
    vi.mocked(getRepositoryVersion).mockResolvedValue('1.0.0');

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataUrl),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );

    expect(result.statusCode).toBe(409);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Package already exists.');
  });

  it('should return 424 error if package uploaded with content is disqualified', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).resolves({});
    vi.mocked(uploadToS3).mockResolvedValue('s3-url');
    vi.mocked(extractVersionFromPackageJson).mockResolvedValue('1.0.0');
    vi.mocked(extractPackageJsonUrl).mockResolvedValue('https://github.com/jashkenas/underscore');
    vi.mocked(getRepoData).mockResolvedValue(invalidRepoData);
    vi.mocked(createPackageService).mockResolvedValue({
      metadata: {
      Name: "Underscore",
      Version: "1.0.0",
      ID: "underscore"
      },
        data: {
        Content: contentString,
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

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataContent),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );
    expect(result.statusCode).toBe(424);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Package is not uploaded due to the disqualified rating.');
  });

  // Test for 500 error on dbPut failure
  it('should return 500 error if database put fails', async () => {
    vi.mocked(validateToken).mockResolvedValue({ isValid: true });
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(PutCommand).rejects(new Error('Database put failed'));
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
        Content: contentString,
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

    const result = await handlePackagePost(
      JSON.stringify(mockPackageDataContent),
      s3Mock as unknown as S3Client,
      ddbMock as unknown as DynamoDBDocumentClient,
      validAuthToken
    );

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('error', 'Failed to store metrics in DynamoDB');
  });
});
