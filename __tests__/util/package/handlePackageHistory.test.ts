// __tests__/util/package/handlePackageHistory.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackageHistory } from '../../../src/package';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

describe('handlePackageHistory', () => {
  const validPackageId = 'examplePackage123';

  const mockPackageData = {
    UploadedBy: 'test-user',
    UploadedAt: '2023-01-01T00:00:00Z',
    DownloadInfo: [
      { timestamp: '2023-01-02T00:00:00Z', user: 'user1' },
      { timestamp: '2023-01-03T00:00:00Z', user: 'user2' },
    ],
  };

  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should return the package history successfully', async () => {
    ddbMock.on(GetCommand).resolves({ Item: mockPackageData });

    const result = await handlePackageHistory(validPackageId, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty('UploadedBy', 'test-user');
    expect(responseBody).toHaveProperty('UploadedAt', '2023-01-01T00:00:00Z');
    expect(Array.isArray(responseBody.DownloadInfo)).toBe(true);
    expect(responseBody.DownloadInfo.length).toBe(2);
    expect(responseBody.DownloadInfo[0]).toHaveProperty('timestamp', '2023-01-02T00:00:00Z');
    expect(responseBody.DownloadInfo[0]).toHaveProperty('user', 'user1');
    expect(responseBody.DownloadInfo[1]).toHaveProperty('timestamp', '2023-01-03T00:00:00Z');
    expect(responseBody.DownloadInfo[1]).toHaveProperty('user', 'user2');
  });

  it('should return 404 if the package does not exist', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handlePackageHistory(validPackageId, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package not found.');
  });

  it('should handle internal server errors gracefully', async () => {
    ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

    const result = await handlePackageHistory(validPackageId, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Internal Server Error');
    expect(responseBody.details).toBe('DynamoDB error');
  });
});