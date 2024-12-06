// Test uploadGithubRepoAsZipToS3 function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { uploadGithubRepoAsZipToS3 } from '../../../src/util/packageUtils';

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Mock axios
vi.mock('axios');

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

beforeEach(() => {
  s3Mock.reset();
  vi.clearAllMocks();
});

describe('uploadGithubRepoAsZipToS3', () => {
  const githubRepoUrl = 'https://github.com/user/repo';
  const fileName = 'repo.zip';
  const bucketName = 'test-bucket';
  const zipContent = 'example zip content';

  it('should upload the GitHub repo as a zip file to S3 and return the base64 string', async () => {
    // Mock axios to return a successful response
    vi.mocked(axios).mockResolvedValue({
      data: Buffer.from(zipContent),
    });

    // Mock the S3 PutObjectCommand to return a successful response
    s3Mock.on(PutObjectCommand).resolves({});

    const result = await uploadGithubRepoAsZipToS3(githubRepoUrl, fileName, s3Mock as unknown as S3Client, bucketName);

    expect(result).toBe(Buffer.from(zipContent).toString('base64'));

    // Check that axios was called with the correct URL
    expect(axios).toHaveBeenCalledWith({
      url: 'https://github.com/user/repo/archive/refs/heads/master.zip',
      method: 'GET',
      responseType: 'arraybuffer',
    });

    // Check that the PutObjectCommand was called with the correct parameters
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: bucketName,
      Key: `packages/${fileName}`,
      Body: Buffer.from(zipContent).toString('base64'),
      ContentType: 'application/octet-stream',
    });
  });

  it('should throw an error if the axios request fails', async () => {
    // Mock axios to throw an error
    vi.mocked(axios).mockRejectedValue(new Error('Download failed'));

    await expect(uploadGithubRepoAsZipToS3(githubRepoUrl, fileName, s3Mock as unknown as S3Client, bucketName)).rejects.toThrow('Download failed');

    // Check that the PutObjectCommand was not called
    expect(s3Mock.commandCalls(PutObjectCommand).length).toBe(0);
  });

  it('should throw an error if the S3 upload fails', async () => {
    // Mock axios to return a successful response
    vi.mocked(axios).mockResolvedValue({
      data: Buffer.from(zipContent),
    });

    // Mock the S3 PutObjectCommand to throw an error
    s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

    await expect(uploadGithubRepoAsZipToS3(githubRepoUrl, fileName, s3Mock as unknown as S3Client, bucketName)).rejects.toThrow('Upload failed');

    // Check that axios was called with the correct URL
    expect(axios).toHaveBeenCalledWith({
      url: 'https://github.com/user/repo/archive/refs/heads/master.zip',
      method: 'GET',
      responseType: 'arraybuffer',
    });

    // Check that the PutObjectCommand was called with the correct parameters
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: bucketName,
      Key: `packages/${fileName}`,
      Body: Buffer.from(zipContent).toString('base64'),
      ContentType: 'application/octet-stream',
    });
  });
});