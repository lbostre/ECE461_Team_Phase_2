// Test downloadAndSaveFromS3 function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { downloadAndSaveFromS3 } from '../../../src/util/packageUtils';

// Mock the S3Client
const s3Mock = mockClient(S3Client);

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

// Mock fs functions
vi.mock('fs');

beforeEach(() => {
  s3Mock.reset();
  vi.clearAllMocks();
});

describe('downloadAndSaveFromS3', () => {
  const fileName = 'example.txt';
  const localPath = '/path/to/local/file.txt';
  const bucketName = 'test-bucket';
  const fileContent = 'example content';

  it('should download the file from S3 and save it to local storage', async () => {
    // Mock the S3 GetObjectCommand to return a successful response
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from(fileContent);
        },
      },
    });

    // Mock fs.writeFileSync to simulate successful file write
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    await downloadAndSaveFromS3(fileName, localPath, s3Mock as unknown as S3Client, bucketName);

    // Check that the GetObjectCommand was called
    const calls = s3Mock.commandCalls(GetObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: bucketName,
      Key: `packages/${fileName}`,
    });

    // Check that fs.writeFileSync was called with the correct arguments
    expect(fs.writeFileSync).toHaveBeenCalledWith(localPath, Buffer.from(fileContent));
  });

  it('should throw an error if the S3 object body is undefined', async () => {
    // Mock the S3 GetObjectCommand to return a response with undefined Body
    s3Mock.on(GetObjectCommand).resolves({
      Body: undefined,
    });

    await expect(downloadAndSaveFromS3(fileName, localPath, s3Mock as unknown as S3Client, bucketName)).rejects.toThrow('S3 object body is undefined');

    // Check that the GetObjectCommand was called
    const calls = s3Mock.commandCalls(GetObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: bucketName,
      Key: `packages/${fileName}`,
    });

    // Ensure fs.writeFileSync was not called
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should handle errors during download or save', async () => {
    // Mock the S3 GetObjectCommand to throw an error
    s3Mock.on(GetObjectCommand).rejects(new Error('Download failed'));

    await expect(downloadAndSaveFromS3(fileName, localPath, s3Mock as unknown as S3Client, bucketName)).rejects.toThrow('Download failed');

    // Check that the GetObjectCommand was called
    const calls = s3Mock.commandCalls(GetObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: bucketName,
      Key: `packages/${fileName}`,
    });

    // Ensure fs.writeFileSync was not called
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
