import { describe, it, expect, vi } from "vitest";
import * as AWS from "aws-sdk";
import { handlePackageRate } from "../src/package";

// Mock DynamoDB
const dynamoDbMock = {
    get: vi.fn(),
};

// Replace AWS DynamoDB with the mock
vi.mock("aws-sdk", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(typeof actual === "object" && actual !== null ? actual : {}),
        DynamoDB: {
            DocumentClient: vi.fn(() => dynamoDbMock),
        },
    };
});

// Define table name used in your function
const TABLE_NAME = "YourDynamoDBTable";

describe("handlePackageRate", () => {
    it("should return 200 and the expected package metrics if the package exists", async () => {
        const mockId = "underscore1137";
        const mockMetrics = {
            License_Latency: 33.573,
            Correctness_Latency: 33.573,
            NetScore: 0.5173156972441008,
            License: 0,
            ResponsiveMaintainer: 0.8394823516790424,
            BusFactor_Latency: 33.573,
            RampUp: 0,
            RampUp_Latency: 33.574,
            NetScore_Latency: 167.866,
            BusFactor: 0.7414448669201521,
            Correctness: 0.9832383506537044,
            ResponsiveMaintainer_Latency: 33.573,
        };
        // Mock successful DynamoDB response
        dynamoDbMock.get.mockReturnValueOnce({
            promise: () =>
                Promise.resolve({
                    Item: { Metrics: mockMetrics },
                }),
        });
        const result = await handlePackageRate(mockId);
        expect(dynamoDbMock.get).toHaveBeenCalledWith({
            TableName: TABLE_NAME,
            Key: { ECEfoursixone: mockId },
            ProjectionExpression: "#metrics",
            ExpressionAttributeNames: { "#metrics": "Metrics" },
        });
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual({ PackageRating: mockMetrics });
    });

    // it("should return 500 if the package is not found", async () => {
    //     const mockId = "non-existent-package-id";
    //     // Mock DynamoDB response with no item
    //     dynamoDbMock.get.mockReturnValueOnce({
    //         promise: () => Promise.resolve({}),
    //     });
    //     const result = await handlePackageRate(mockId);
    //     console.log(JSON.stringify(result));
    //     expect(result.statusCode).toBe(500);
    //     expect(JSON.parse(result.body)).toEqual({
    //         error: "Failed to fetch metrics",
    //         details: "Missing region in config",
    //     });
    // });

    // it("should return 500 if there is an internal server error", async () => {
    //     const mockId = "package-causing-error";
    //     // Mock DynamoDB throwing an error
    //     dynamoDbMock.get.mockReturnValueOnce({
    //         promise: () => Promise.reject(new Error("DynamoDB error")),
    //     });
    //     const result = await handlePackageRate(mockId);
    //     expect(result.statusCode).toBe(500);
    //     expect(JSON.parse(result.body)).toEqual({
    //         error: "Failed to fetch metrics",
    //         details: "Missing region in config",
    //     });
    // });
});
