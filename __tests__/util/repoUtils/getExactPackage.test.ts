// __tests__/util/packageUtils/getExactPackage.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getExactPackage } from '../../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('getExactPackage', () => {
  const tableName = 'ECE461_Database';
  const name = 'examplePackage';
  const version = '1.0.0';
  const packageId = `${name}${version.replace(/\./g, "")}`;

  const mockItem = {
    ECEfoursixone: packageId,
    Version: version,
  };

  const mockResponse = {
    Items: [mockItem],
  };

  beforeEach(() => {
    ddbMock.reset();
  });

  it('should return the package for a valid name and version', async () => {
    ddbMock.on(QueryCommand).resolves(mockResponse);

    const result = await getExactPackage(name, version, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toEqual({
      Version: version,
      Name: name,
      ID: packageId,
    });

    const commandCalls = ddbMock.commandCalls(QueryCommand, {
      TableName: tableName,
      KeyConditionExpression: 'ECEfoursixone = :id',
      ExpressionAttributeValues: {
        ':id': packageId,
      },
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should return null if the package is not found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await getExactPackage(name, version, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result).toBeNull();

    const commandCalls = ddbMock.commandCalls(QueryCommand, {
      TableName: tableName,
      KeyConditionExpression: 'ECEfoursixone = :id',
      ExpressionAttributeValues: {
        ':id': packageId,
      },
    });
    expect(commandCalls.length).toBe(1);
  });

  it('should throw an error if DynamoDB query fails', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

    await expect(getExactPackage(name, version, ddbMock as unknown as DynamoDBDocumentClient)).rejects.toThrow('Could not query exact package.');

    const commandCalls = ddbMock.commandCalls(QueryCommand, {
      TableName: tableName,
      KeyConditionExpression: 'ECEfoursixone = :id',
      ExpressionAttributeValues: {
        ':id': packageId,
      },
    });
    expect(commandCalls.length).toBe(1);
  });
});