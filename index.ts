import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import {
    handlePackagePost,
    handlePackageGet,
    handlePackageRate,
    handlePackageCost,
} from "./src/package.js";
import {
    validateToken,
    handleAuthenticate,
    registerUser,
    deleteUser,
} from "./src/util/authUtil.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Initialize S3 and DynamoDB clients
const s3Client = new S3Client({ region: "us-east-1" });
const dynamoDbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

async function extractAndValidateToken(
    event: APIGatewayEvent
): Promise<boolean> {
    const authHeader = event.headers["X-Authorization"];
    if (!authHeader) {
        return false; // No token provided
    }

    const token = authHeader.replace("bearer ", "").trim();
    return await validateToken(token);
}

export const handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, body, headers } = event;

    // Get Auth Token
    if (path === "/authenticate" && httpMethod === "PUT") {
        return handleAuthenticate(body, dynamoDbDocumentClient);
    }

    const id = pathParameters?.id;

    // /package/{id}/rate
    if (path === `/package/${id}/rate`) {
        return handlePackageRate(id, dynamoDbDocumentClient);
    }
    // /package/{id}
    else if (path === `/package/${id}`) {
        return handlePackageGet(id, dynamoDbDocumentClient);
    }
    // /package/{id}/cost
    else if (path === `/package/${id}/cost`) {
        return handlePackageCost(
            id,
            event.queryStringParameters?.dependency === "true",
            dynamoDbDocumentClient
        );
    }

    // Register a User
    if (path === "/users" && httpMethod === "POST") {
        const authToken =
            headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const isValidToken = await validateToken(authToken, dynamoDbDocumentClient);
        if (!isValidToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        if (!body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Request body is missing." }),
            };
        }

        let newUser;
        try {
            newUser = JSON.parse(body);
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid JSON format." }),
            };
        }

        if (
            !newUser.name ||
            !newUser.password ||
            typeof newUser.isAdmin !== "boolean" ||
            !Array.isArray(newUser.permissions) ||
            !newUser.group
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid user data." }),
            };
        }

        return registerUser(authToken, newUser, dynamoDbDocumentClient);
    }

    //Delete a User
    if (
        pathParameters?.id &&
        path === `/users/${pathParameters.id}` &&
        httpMethod === "DELETE"
    ) {
        const authToken =
            headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        return deleteUser(authToken, pathParameters.id);
    }

    // /tracks
    if (path === "/tracks" && httpMethod === "GET") {
        return {
            statusCode: 200,
            body: JSON.stringify({
                plannedTracks: ["Access control track"],
            }),
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Path Not Found" }),
    };
};
