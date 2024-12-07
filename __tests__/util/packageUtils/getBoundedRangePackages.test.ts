// __tests__/util/packageUtils/getBoundedRangePackages.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getBoundedRangePackages } from '../../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getBoundedRangePackages', () => {
  const tableName = 'ECE461_Database';
  const name = 'examplePackage';
  const range = ['1.0.0', '2.0.0'];

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
  });

  it('should return packages within the bounded range', async () => {
    ddbMock.on(ScanCommand).resolves(mockResponse);

    const result = await getBoundedRangePackages(name, range, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual([
      { Version: '1.0.0', Name: 'examplePackage', ID: 'examplePackage100' },
      { Version: '1.5.0', Name: 'examplePackage', ID: 'examplePackage150' },
      { Version: '2.0.0', Name: 'examplePackage', ID: 'examplePackage200' },
    ]);

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
      FilterExpression: 'contains(ECEfoursixone, :name) AND #version BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#version': 'Version',
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':start': range[0],
        ':end': range[1],
      },
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should return an empty array if no packages are found', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [] });

    const result = await getBoundedRangePackages(name, range, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual([]);

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
      FilterExpression: 'contains(ECEfoursixone, :name) AND #version BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#version': 'Version',
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':start': range[0],
        ':end': range[1],
      },
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should throw an error if DynamoDB scan fails', async () => {
    ddbMock.on(ScanCommand).rejects(new Error('DynamoDB error'));

    await expect(getBoundedRangePackages(name, range, ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Could not query bounded range packages.');

    const commandCalls = ddbMock.commandCalls(ScanCommand, {
      TableName: tableName,
      FilterExpression: 'contains(ECEfoursixone, :name) AND #version BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#version': 'Version',
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':start': range[0],
        ':end': range[1],
      },
    });
    expect(commandCalls.length).toBe(1);
  });
});