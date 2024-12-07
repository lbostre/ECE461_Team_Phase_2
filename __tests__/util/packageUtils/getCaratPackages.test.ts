// __tests__/util/packageUtils/getCaratPackages.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getCaratPackages } from '../../../src/util/packageUtils';
import semver from 'semver';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getCaratPackages', () => {
  const tableName = 'ECE461_Database';
  const name = 'examplePackage';
  const version = '1.0.0';

  const mockItems = [
    {
      ECEfoursixone: 'examplePackage100',
      Name: 'examplePackage',
      Version: '1.0.0',
    },
    {
      ECEfoursixone: 'examplePackage150',
      Name: 'examplePackage',
      Version: '1.5.0',
    },
    {
      ECEfoursixone: 'examplePackage200',
      Name: 'examplePackage',
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

  it('should return packages within the carat range', async () => {
    ddbMock.on(ScanCommand).resolves(mockResponse);

    const result = await getCaratPackages(name, version, ddbMock as unknown as DynamoDBDocumentClient);
    console.log(result);
    expect(result).toEqual([
      { Version: '1.0.0', Name: 'examplePackage', ID: 'examplePackage100' },
      { Version: '1.5.0', Name: 'examplePackage', ID: 'examplePackage150' },
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
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    const result = await getCaratPackages(name, version, ddbMock as unknown as DynamoDBDocumentClient);

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
    const invalidVersion = 'invalid-version';

    await expect(getCaratPackages(name, invalidVersion, ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Invalid version format for carat range');

    expect(ddbMock.commandCalls(ScanCommand).length).toBe(0);
  });

  it('should throw an error if DynamoDB scan fails', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    await expect(getCaratPackages(name, version, ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Could not query carat packages.');

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