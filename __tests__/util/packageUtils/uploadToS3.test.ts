import { describe, it, expect, beforeEach } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { uploadToS3 } from '../../../src/util/packageUtils';

// Mock the S3Client
const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
});

describe('uploadToS3', () => {
  const content = 'example content';
  const fileName = 'example.txt';
  const bucketName = 'test-bucket';

  it('should upload the file to S3 and return the file URL', async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    const result = await uploadToS3(content, fileName, s3Mock as unknown as S3Client, bucketName);

    expect(result).toBe(`example content`);

    // Use mock assertions directly
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(1);
    expect(calls[0].args[0].input).toEqual({
      Bucket: bucketName,
      Key: `packages/${fileName}`,
      ContentType: "application/zip",
      Body: Buffer.from(content),
    });
  });

  it('should throw an error if the upload fails', async () => {
    s3Mock.on(PutObjectCommand).rejects(new Error('Upload failed'));

    await expect(uploadToS3(content, fileName, s3Mock as unknown as S3Client, bucketName)).rejects.toThrow('Upload failed');

    // Assert command call
    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(1);
  });
});
