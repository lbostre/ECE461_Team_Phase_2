import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import AWS from "aws-sdk";
import {
    handlePackagePost,
    handlePackageGet,
    handlePackageRate,
    handlePackageCost,
    handlePackageUpdate,
} from "./src/package.js";
import {
    validateToken,
    handleAuthenticate,
    registerUser,
    deleteUser,
} from "./src/util/authUtil.js";
// Initialize S3 client
export const s3Client = new S3Client({
    region: "us-east-1", 
});

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDb = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = "ece461phase2";

async function extractAndValidateToken(
    event: APIGatewayEvent
): Promise<boolean> {
    const authHeader = event.headers["X-Authorization"];
    if (!authHeader) {
        return false; // No token provided
    }

    const token = authHeader.replace("bearer ", "").trim();
    return await validateToken(token, dynamoDb);
}

export const handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, body, headers } = event;

    if (httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
            },
            body: "",
        };
    }

    //Get Auth Token
    if (path === "/authenticate" && httpMethod === "PUT") {
        return handleAuthenticate(body, dynamoDb);
    }

    if (path === "/package" && httpMethod === "POST") {
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        return handlePackagePost(body, s3Client, dynamoDb);
    }

    // Handle GET request to /package/{id}
    if (httpMethod === "GET") {
        // Validate token
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
    
        // Check if pathParameters or ID is missing
        if (!pathParameters || !pathParameters.id) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "There is missing field(s) in the PackageID or it is formed improperly, or is invalid.",
                }),
            };
        }
    
        const id = pathParameters.id;
    
        // Handle specific routes
        if (path === `/package/${id}/rate`) {
            return handlePackageRate(id, dynamoDb);
        } else if (path === `/package/${id}`) {
            return handlePackageGet(id, dynamoClient, s3Client, BUCKET_NAME);
        } else if (path === `/package/${id}/cost`) {
            return handlePackageCost(id, event.queryStringParameters?.dependency === "true", dynamoDb);
        }
    }

    if (httpMethod === "POST" && pathParameters && pathParameters.id) {
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const id = pathParameters.id;
        const body = event.body;
        if (path === `/package/${id}` && body) {
            return handlePackageUpdate(id, body, dynamoDb, s3Client);
        }
    }

    //Register a User
    if (path === "/users" && httpMethod === "POST") {
        const authToken =
            headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const newUser = body ? JSON.parse(body) : null;
        return registerUser(authToken, newUser, dynamoDb);
    }

    //Delete a User
    if (pathParameters?.id && path === `/users/${pathParameters.id}` && httpMethod === "DELETE") {
        const authToken = headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                },
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        return deleteUser(authToken, pathParameters.id, dynamoDb);
    }

    // /tracks
    if (path === "/tracks" && httpMethod === "GET") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
            },
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
