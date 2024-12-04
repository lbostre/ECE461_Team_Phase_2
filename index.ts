import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { handlePackagePost, 
         handlePackageGet, 
         handlePackageRate,
         handlePackageCost,
       } from "./src/package.js";
import { validateToken, handleAuthenticate, registerUser, deleteUser } from "./src/util/authUtil.js";
// Initialize S3 client
export const s3 = new AWS.S3();
export const BUCKET_NAME = "ece461phase2";

async function extractAndValidateToken(event: APIGatewayEvent): Promise<boolean> {
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

    //Get Auth Token
    if (path === "/authenticate" && httpMethod === "PUT") {
        return handleAuthenticate(body);
    }

    if (path === "/package" && httpMethod === "POST") {
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        return handlePackagePost(body);
    }

    // Handle GET request to /package/{id}
    if (httpMethod === "GET" && pathParameters && pathParameters.id) {
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        const id = pathParameters.id; 
        // /package/{id}/rate 
        if (path === `/package/${id}/rate`) { 
            return handlePackageRate(id);
        }
        // /package/{id}
        else if (path === `/package/${id}`) {  
            return handlePackageGet(id);
        }
        // /package/{id}/cost
        else if (path === `/package/${id}/cost`) {
            return handlePackageCost(id, event.queryStringParameters?.dependency === "true");
        }
    }

    //Register a User
    if (path === "/users" && httpMethod === "POST") {
        const authToken = headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        const newUser = body ? JSON.parse(body) : null;
        return registerUser(authToken, newUser);
    }

    //Delete a User
    if (pathParameters?.id && path === `/users/${pathParameters.id}` && httpMethod === "DELETE") {
        const authToken = headers["X-Authorization"] || headers["x-authorization"];
        if (!authToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        const isValidToken = await extractAndValidateToken(event);
        if (!isValidToken) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        return deleteUser(authToken, pathParameters.id);
    }

    // /tracks
    if (path === '/tracks' && httpMethod === "GET") {
        return {
            statusCode: 200,
            body: JSON.stringify({
                plannedTracks: ["Access control track"]
            }),
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Path Not Found" }),
    };
};
