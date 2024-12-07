// __tests__/endpoints/handlePackageCost.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handlePackageCost } from '../../../src/package';
import { fetchCostWithGraphQL } from '../../../src/util/packageUtils';

// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock the fetchCostWithGraphQL function
vi.mock('../../../src/util/packageUtils', async () => {
  const originalModule = await vi.importActual<typeof import('../../../src/util/packageUtils')>('../../../src/util/packageUtils');
  return {
    ...originalModule,
    fetchCostWithGraphQL: vi.fn(),
  };
});

describe('handlePackageCost', () => {
  const id = 'examplePackage123';
  const includeDependencies = true;

  const mockCostData = {
    Item: {
      packageID: 'examplePackage123',
      standaloneCost: 100,
      totalCost: 150,
    },
  };

  const mockPackageData = {
    Item: {
      ECEfoursixone: 'examplePackage123',
      URL: 'https://example.com',
    },
  };

  const mockGraphQLResponse = {
    standaloneCost: 100,
    totalCost: 150,
    dependencies: {
      'dependency1': { standaloneCost: 50, totalCost: 50 },
    },
  };

  beforeEach(() => {
    ddbMock.reset();
    vi.clearAllMocks();
  });

  it('should return the cost data from the Cost Table if it exists', async () => {
    ddbMock.on(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).resolves(mockCostData);

    const result = await handlePackageCost(id, includeDependencies, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toEqual({
      [id]: { standaloneCost: 100, totalCost: 150 },
    });

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).length).toBe(1);
  });

  it('should fetch cost data using GraphQL if not found in Cost Table', async () => {
    ddbMock.on(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).resolves({ Item: undefined });

    ddbMock.on(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    }).resolves(mockPackageData);

    vi.mocked(fetchCostWithGraphQL).mockResolvedValue(mockGraphQLResponse);

    const result = await handlePackageCost(id, includeDependencies, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(200);
    const responseBody = JSON.parse(result.body);
    expect(responseBody).toEqual({
      [id]: { standaloneCost: 100, totalCost: 150 },
      'dependency1': { standaloneCost: 50, totalCost: 50 },
    });

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).length).toBe(1);

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    }).length).toBe(1);

    expect(fetchCostWithGraphQL).toHaveBeenCalledWith('https://example.com', includeDependencies);
  });

  it('should return 404 if the package is not found', async () => {
    ddbMock.on(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).resolves({ Item: undefined });

    ddbMock.on(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    }).resolves({ Item: undefined });

    const result = await handlePackageCost(id, includeDependencies, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Package does not exist.');

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).length).toBe(1);

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_Database',
      Key: { ECEfoursixone: id },
    }).length).toBe(1);
  });

  it('should return 500 if there is an internal server error', async () => {
    ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

    const result = await handlePackageCost(id, includeDependencies, ddbMock as unknown as DynamoDBDocumentClient);

    expect(result.statusCode).toBe(500);
    const responseBody = JSON.parse(result.body);
    expect(responseBody.error).toBe('Error calculating package cost.');

    expect(ddbMock.commandCalls(GetCommand, {
      TableName: 'ECE461_CostTable',
      Key: { packageID: id },
    }).length).toBe(1);
  });
});