// __tests__/util/package/handlePackageHistory.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackageHistory } from '../../../src/package';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

describe('handlePackageHistory', () => {
  const packageName = 'examplePackage';
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  it('should return 400 if the package name is missing', async () => {
    const result = await handlePackageHistory('', ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package name is missing or invalid.');
  });

  it('should return 404 if no history is found for the specified package', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handlePackageHistory(packageName, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('No history found for the specified package.');
  });

  it('should return 200 and the package history if history is found', async () => {
    const mockHistoryItems = [
      {
        User: { username: 'testuser', isAdmin: false },
        Timestamp: '2023-01-01T00:00:00Z',
        PackageMetadata: { Name: 'examplePackage', Version: '1.0.0', ID: 'examplePackage123' },
        Action: 'created',
      },
      {
        User: { username: 'adminuser', isAdmin: true },
        Timestamp: '2023-01-02T00:00:00Z',
        PackageMetadata: { Name: 'examplePackage', Version: '1.0.1', ID: 'examplePackage123' },
        Action: 'updated',
      },
    ];

    ddbMock.on(QueryCommand).resolves({ Items: mockHistoryItems });

    const result = await handlePackageHistory(packageName, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody.length).toBe(2);
    expect(responseBody[0]).toHaveProperty('User');
    expect(responseBody[0].User).toHaveProperty('name', 'testuser');
    expect(responseBody[0].User).toHaveProperty('isAdmin', false);
    expect(responseBody[0]).toHaveProperty('Date', '2023-01-01T00:00:00Z');
    expect(responseBody[0]).toHaveProperty('PackageMetadata');
    expect(responseBody[0].PackageMetadata).toHaveProperty('Name', 'examplePackage');
    expect(responseBody[0].PackageMetadata).toHaveProperty('Version', '1.0.0');
    expect(responseBody[0].PackageMetadata).toHaveProperty('ID', 'examplePackage123');
    expect(responseBody[0]).toHaveProperty('Action', 'created');
  });

  it('should handle internal server errors gracefully', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

    const result = await handlePackageHistory(packageName, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Failed to retrieve package history.');
    expect(responseBody.details).toBe('DynamoDB error');
  });
});