// __tests__/util/packageUtils/getTildePackages.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getTildePackages } from '../../../src/util/packageUtils';
import semver from 'semver';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock semver
vi.mock('semver');

describe('getTildePackages', () => {
  const tableName = 'ECE461_Database';
  const name = 'examplePackage';
  const version = '1.0.0';

  const mockItems = [
    {
      ECEfoursixone: 'examplePackage100',
      Version: '1.0.0',
    },
    {
      ECEfoursixone: 'examplePackage150',
      Version: '1.5.0',
    },
    {
      ECEfoursixone: 'examplePackage200',
      Version: '2.0.0',
    },
  ];

  const mockResponse = {
    Items: mockItems,
  };

  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should return packages within the tilde range', async () => {
    vi.mocked(semver.validRange).mockReturnValue('>=1.0.0 <1.1.0');
    ddbMock.on(ScanCommand).resolves(mockResponse);

    const result = await getTildePackages(name, version, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual([
      { Version: '1.0.0', Name: 'examplePackage', ID: 'examplePackage100' },
    ]);

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
      FilterExpression: 'contains(ECEfoursixone, :name)',
      ExpressionAttributeValues: {
        ':name': name,
      },
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should return an empty array if no packages are found', async () => {
    vi.mocked(semver.validRange).mockReturnValue('>=1.0.0 <1.1.0');
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    const result = await getTildePackages(name, version, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual([]);

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
      FilterExpression: 'contains(ECEfoursixone, :name)',
      ExpressionAttributeValues: {
        ':name': name,
      },
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should throw an error if the version format is invalid', async () => {
    vi.mocked(semver.validRange).mockReturnValue(null);

    await expect(getTildePackages(name, version, ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Invalid version format for tilde range');

    expect(ddbMock.commandCalls(ScanCommand).length).toBe(0);
  });

  it('should throw an error if DynamoDB scan fails', async () => {
    vi.mocked(semver.validRange).mockReturnValue('>=1.0.0 <1.1.0');
    ddbMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    await expect(getTildePackages(name, version, ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Could not query tilde packages.');

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
      FilterExpression: 'contains(ECEfoursixone, :name)',
      ExpressionAttributeValues: {
        ':name': name,
      },
    });
    expect(commandCalls.length).toBe(1);
  });
});