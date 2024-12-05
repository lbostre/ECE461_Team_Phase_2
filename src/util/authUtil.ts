import { APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import jwt from "jsonwebtoken";
import { AuthenticationRequest } from "../../types.js";

const USER_TABLE_NAME = "ECE461_UsersTable";
const JWT_SECRET = process.env.JWT_SECRET || "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Allow requests from any origin
    "Access-Control-Allow-Methods": "OPTIONS, PUT", // Specify allowed methods
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization", // Specify allowed headers
};

// Handle authentication requests and token creation
export async function handleAuthenticate(body: any, dynamoDb: DynamoDBDocumentClient): Promise<APIGatewayProxyResult> {
    try {
        const parsedBody = body ? JSON.parse(body) : null;

        if (!parsedBody || !parsedBody.User || !parsedBody.Secret) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "There is missing field(s) in the AuthenticationRequest or it is formed improperly.",
                }),
            };
        }

        const { User, Secret }: AuthenticationRequest = parsedBody;

        // Validate user credentials from the database
        const userResult = await dynamoDb.send(new GetCommand({
            TableName: USER_TABLE_NAME,
            Key: { username: User.name },
        }));

        // Log for debugging purposes
        console.log("User result:", userResult);

        if (!userResult.Item || userResult.Item.password !== Secret.password) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: "The username or password is invalid." }),
            };
        }

        const user = userResult.Item;

        // Check if the current token is expired or past 1000 API interactions
        if (user.expiresAt > Math.floor(Date.now() / 1000) && user.callCount <= 1000) {
            console.log("Returning existing unexpired token.");
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ token: `bearer ${user.authToken}` }),
            };
        }

        // If the token is expired, generate a new token
        console.log("Existing token expired. Generating a new token.");
        const newAuthToken = jwt.sign(
            { name: User.name, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: "10h" }
        );

        // Update the token and expiration time in the database
        await dynamoDb.send(new UpdateCommand({
            TableName: USER_TABLE_NAME,
            Key: { username: User.name },
            UpdateExpression: "SET authToken = :authToken, expiresAt = :expiresAt, callCount = :callCount",
            ExpressionAttributeValues: {
                ":authToken": newAuthToken,
                ":expiresAt": Math.floor(Date.now() / 1000) + 10 * 60 * 60, // 10 hours in seconds
                ":callCount": 0, // Reset call count for the new token
            },
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ token: `bearer ${newAuthToken}` }),
        };
    } catch (error) {
        console.error("Error handling authentication:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

// Register a new user and generate an authentication token
export async function registerUser(
    authToken: string,
    newUser: { name: string; password: string; isAdmin: boolean; permissions: string[]; group: string },
    dynamoDb: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        const token = authToken.replace("bearer ", "").trim();
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        
        if (!decoded || !decoded.isAdmin) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Only admins can register users." }),
            };
        }

        // Store the new user details in DynamoDB
        await dynamoDb.send(new PutCommand({
            TableName: USER_TABLE_NAME,
            Item: {
                username: newUser.name,
                password: newUser.password, 
                isAdmin: newUser.isAdmin,
                permissions: newUser.permissions,
                group: newUser.group,
                callCount: 0,
                expiresAt: Math.floor(Date.now() / 1000) + 10 * 60 * 60, // 10 hours in seconds
            },
        }));

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "User registered successfully.",
                token: `bearer ${token}`,
            }),
        };
    } catch (error) {
        console.error("Error registering user:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

// Middleware to validate token and track call count
export async function validateToken(authToken: string, dynamoDb: DynamoDBDocumentClient): Promise<boolean> {
    try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as jwt.JwtPayload;

        const result = await dynamoDb.send(new GetCommand({
            TableName: USER_TABLE_NAME,
            Key: { username: decoded.name },
        }));

        if (!result.Item) return false;

        const { callCount, expiresAt } = result.Item;
        if (Date.now() / 1000 > expiresAt || callCount >= 1000) return false;

        await dynamoDb.send(new UpdateCommand({
            TableName: USER_TABLE_NAME,
            Key: { username: decoded.name },
            UpdateExpression: "SET callCount = callCount + :inc",
            ExpressionAttributeValues: { ":inc": 1 },
        }));

        return true;
    } catch (error) {
        console.error("Error validating token:", error);
        return false;
    }
}

// Function to delete user account
export async function deleteUser(authToken: string, username: string, dynamoDb: DynamoDBDocumentClient): Promise<APIGatewayProxyResult> {
    const token = authToken.replace("bearer ", "").trim();
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded || (decoded.name !== username && !decoded.isAdmin)) {
        return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Unauthorized action." }),
        };
    }

    await dynamoDb.send(new DeleteCommand({
        TableName: USER_TABLE_NAME,
        Key: { username },
    }));

    return { 
        statusCode: 200, 
        headers: corsHeaders, 
        body: JSON.stringify({ message: "User deleted successfully." })
    };
}