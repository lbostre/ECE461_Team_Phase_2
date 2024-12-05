import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handlePackageRate } from '../../../src/package';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Test handlePackageRate function


// Mock the DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

// Set the region to avoid the Missing region in config error
process.env.AWS_REGION = 'us-east-1';
process.env.JWT_SECRET = 'test-secret';

// Mock AWS credentials
process.env.AWS_ACCESS_KEY_ID = 'test-access-key-id';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key';

beforeEach(() => {
    ddbMock.reset();
});

describe('handlePackageRate', () => {
    const validPackageId = 'valid-package-id';
    const invalidPackageId = 'invalid-package-id';

    beforeEach(() => {
        // Mock the DynamoDB GetCommand to return a predefined response for valid package ID
        ddbMock.on(GetCommand, {
            TableName: 'ECE461_Database',
            Key: { ECEfoursixone: validPackageId },
            ProjectionExpression: '#metrics',
            ExpressionAttributeNames: {
                '#metrics': 'Metrics',
            },
        }).resolves({
            Item: {
                Metrics: {
                    NetScore: 0.8,
                    RampUp: 0.7,
                    Correctness: 0.9,
                    BusFactor: 0.6,
                    ResponsiveMaintainer: 0.8,
                    LicenseScore: 1.0,
                },
            },
        });

        // Mock the DynamoDB GetCommand to return undefined for invalid package ID
        ddbMock.on(GetCommand, {
            TableName: 'ECE461_Database',
            Key: { ECEfoursixone: invalidPackageId },
            ProjectionExpression: '#metrics',
            ExpressionAttributeNames: {
                '#metrics': 'Metrics',
            },
        }).resolves({ Item: undefined });
    });

    it('should return the package rating for a valid package ID', async () => {
        const result = await handlePackageRate(validPackageId, ddbMock as unknown as DynamoDBDocumentClient);

        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody).toHaveProperty('PackageRating');
        expect(responseBody.PackageRating).toHaveProperty('NetScore', 0.8);
        expect(responseBody.PackageRating).toHaveProperty('RampUp', 0.7);
        expect(responseBody.PackageRating).toHaveProperty('Correctness', 0.9);
        expect(responseBody.PackageRating).toHaveProperty('BusFactor', 0.6);
        expect(responseBody.PackageRating).toHaveProperty('ResponsiveMaintainer', 0.8);
        expect(responseBody.PackageRating).toHaveProperty('LicenseScore', 1.0);
    });

    it('should return 404 if the package does not exist', async () => {
        const result = await handlePackageRate(invalidPackageId, ddbMock as unknown as DynamoDBDocumentClient);

        expect(result.statusCode).toBe(404);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Metrics not found for this package');
    });

    it('should return 500 if there is an internal server error', async () => {
        ddbMock.on(GetCommand).rejects(new Error('Internal Server Error'));

        const result = await handlePackageRate(validPackageId, ddbMock as unknown as DynamoDBDocumentClient);

        expect(result.statusCode).toBe(500);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('Failed to fetch metrics');
    });
});