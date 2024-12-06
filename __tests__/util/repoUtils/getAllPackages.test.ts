// __tests__/util/packageUtils/getAllPackages.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getAllPackages } from '../../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getAllPackages', () => {
  const tableName = 'ECE461_Database';

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
    LastEvaluatedKey: undefined,
  };

  beforeEach(() => {
    ddbMock.reset();
  });

  it('should return all packages from the database', async () => {
    ddbMock.on(ScanCommand).resolves(mockResponse);

    const result = await getAllPackages(ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual([
      { Version: '1.0.0', Name: 'examplePackage', ID: 'examplePackage100' },
      { Version: '1.5.0', Name: 'examplePackage', ID: 'examplePackage150' },
      { Version: '2.0.0', Name: 'examplePackage', ID: 'examplePackage200' },
    ]);

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should return an empty array if no packages are found', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    const result = await getAllPackages(ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual([]);

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should throw an error if DynamoDB scan fails', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    await expect(getAllPackages(ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Could not retrieve all packages.');

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
    });
    expect(commandCalls.length).toBe(1);
  });
});