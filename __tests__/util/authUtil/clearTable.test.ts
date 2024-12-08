// __tests__/util/authUtil/clearTable.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { clearTable } from '../../../src/util/authUtil';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

beforeEach(() => {
  ddbMock.reset();
  vi.clearAllMocks();
});

const tableName = 'ECE461_UsersTable';
const key = 'ECEfoursixone';

const mockItems = [
  { username: 'user1' },
  { username: 'user2' },
];

const mockScanResponse = {
  Items: mockItems,
  LastEvaluatedKey: undefined,
};

describe('clearTable', () => {
  it('should clear the table successfully', async () => {
    ddbMock.on(ScanCommand).resolvesOnce(mockScanResponse).resolvesOnce({ Items: [] });
    ddbMock.on(DeleteCommand).resolves({});

    await clearTable(tableName, ddbMock as unknown as DynamoDBDocumentClient, key);

    const scanCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
    });
    expect(scanCalls.length).toBe(2);

    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls.length).toBe(mockItems.length);
    expect(deleteCalls[0].args[0].input.Key).toEqual({ username: 'user1' });
    expect(deleteCalls[1].args[0].input.Key).toEqual({ username: 'user2' });
  });

  it('should handle the case where there are no items to delete', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    await clearTable(tableName, ddbMock as unknown as DynamoDBDocumentClient, key);

    const scanCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
    });
    expect(scanCalls.length).toBe(1);

    const deleteCalls = ddbMock.commandCalls(DeleteCommand);
    expect(deleteCalls.length).toBe(0);
  });

  it('should throw an error if there is an internal server error', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('Internal Server Error'));

    await expect(clearTable(tableName, ddbMock as unknown as DynamoDBDocumentClient, key)).rejects.toThrow('Internal Server Error');

    const scanCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
    });
    expect(scanCalls.length).toBe(1);
  });
});