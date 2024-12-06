import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import {
    handlePackagePost,
    handlePackageGet,
    handlePackageRate,
    handlePackageCost,
    handlePackageUpdate,
    handlePackagesList,
    handlePackageByRegEx,
} from "./src/package.js";
import {
    validateToken,
    handleAuthenticate,
    registerUser,
    deleteUser,
    handleGetUser,
    handleReset,
} from "./src/util/authUtil.js";
// Initialize S3 client
const s3Client = new S3Client({
    region: "us-east-1", 
});
const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDb = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = "ece461phase2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
};

async function extractAndValidateToken(
    event: APIGatewayEvent
): Promise<{ isValid: boolean; error?: string }> {
    const authHeader = event.headers["X-Authorization"] || event.headers["x-authorization"];
    if (!authHeader) {
        return { isValid: false, error: "No authentication token provided." };
    }

    const token = authHeader.replace("bearer ", "").trim();
    return await validateToken(token, dynamoDb, event.path);
}

export const handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, body, headers, queryStringParameters } = event;

    if (httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: "",
        };
    }

    if (httpMethod === "POST" && path === "/packages") {
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const offset = queryStringParameters?.offset ? parseInt(queryStringParameters.offset, 10) : 0;
        return handlePackagesList(body, offset, dynamoDb);
    }

    //Get Auth Token
    if (path === "/authenticate" && httpMethod === "PUT") {
        return handleAuthenticate(body, dynamoDb);
    }

    if (path === "/package" && httpMethod === "POST") {
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const authToken = headers["X-Authorization"] || headers["x-authorization"];
        if (authToken) {
            return handlePackagePost(body, s3Client, dynamoDb, authToken);
        }
    }

    if (path === `/package/byRegEx` && httpMethod === 'POST') {
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        return handlePackageByRegEx(body, dynamoDb);
    }

    if (httpMethod === "GET") {
        // /tracks
        if (path === "/tracks") {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    plannedTracks: ["Access control track"],
                }),
            };
        }
        // /users GET 
        if (path === "/users" && httpMethod === "GET") {
            const authToken = headers["X-Authorization"] || headers["x-authorization"];
            if (!authToken) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: "Authentication failed due to invalid or missing AuthenticationToken.",
                    }),
                };
            }
            // Handle the GET user request using the helper function from authUtil.ts
            return handleGetUser(authToken, dynamoDb);
        }
        // Validate token
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        // Check if pathParameters or ID is missing
        if (!pathParameters || !pathParameters.id) {
            return {
                statusCode: 400,
                headers: corsHeaders,
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
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const id = pathParameters.id;
        const body = event.body;
        const authToken = headers["X-Authorization"] || headers["x-authorization"];
        if (path === `/package/${id}` && body && authToken) {
            return handlePackageUpdate(id, body, dynamoDb, s3Client, authToken);
        }
    }

    //Register a User
    if (path === "/users" && httpMethod === "POST") {
        const authToken = headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
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
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        const validation = await extractAndValidateToken(event);
        if (!validation.isValid) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Authentication failed due to invalid or missing AuthenticationToken.",
                }),
            };
        }
        return deleteUser(authToken, pathParameters.id, dynamoDb);
    }

    if (path === '/reset' && httpMethod === 'DELETE') {
        try {
            const validation = await extractAndValidateToken(event);
            if (!validation.isValid) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: "Authentication failed due to invalid or missing AuthenticationToken.",
                    }),
                };
            }
            const authToken = headers["X-Authorization"] || headers["x-authorization"];
            if (authToken) {
                return await handleReset(authToken, dynamoDb);
            }
        } catch (error) {
            console.error("Error processing request:", error);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: "Internal Server Error",
                }),
            };
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Path Not Found" }),
    };
};
