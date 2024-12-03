import { APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import jwt from "jsonwebtoken";
import { AuthenticationRequest } from "../../types.js";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USER_TABLE_NAME = "ECE461_UsersTable";
const JWT_SECRET = process.env.JWT_SECRET || "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";

// Handle authentication requests and token creation
export async function handleAuthenticate(body: any): Promise<APIGatewayProxyResult> {
    try {
        const parsedBody = body ? JSON.parse(body) : null;

        if (!parsedBody || !parsedBody.User || !parsedBody.Secret) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "There is missing field(s) in the AuthenticationRequest or it is formed improperly.",
                }),
            };
        }

        const { User, Secret }: AuthenticationRequest = parsedBody;

        // Validate user credentials from the database
        const userResult = await dynamoDb
            .get({
                TableName: USER_TABLE_NAME,
                Key: { username: User.name },
            })
            .promise();

        if (!userResult.Item || userResult.Item.password !== Secret.password) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: "The username or password is invalid." }),
            };
        }

        const user = userResult.Item;

        // Check if the current token is expired or past 1000 API interactions
        if (user.expiresAt > Math.floor(Date.now() / 1000) && user.callCount <= 1000) {
            console.log("Returning existing unexpired token.");
            return {
                statusCode: 200,
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
        await dynamoDb
            .update({
                TableName: USER_TABLE_NAME,
                Key: { username: User.name },
                UpdateExpression: "SET authToken = :authToken, expiresAt = :expiresAt, callCount = :callCount",
                ExpressionAttributeValues: {
                    ":authToken": newAuthToken,
                    ":expiresAt": Math.floor(Date.now() / 1000) + 10 * 60 * 60, // 10 hours in seconds
                    ":callCount": 0, // Reset call count for the new token
                },
            })
            .promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ token: `bearer ${newAuthToken}` }),
        };
    } catch (error) {
        console.error("Error handling authentication:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

// Register a new user and generate an authentication token
export async function registerUser(
    authToken: string,
    newUser: { name: string; password: string; isAdmin: boolean; permissions: string[]; group: string }
): Promise<APIGatewayProxyResult> {
    try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as jwt.JwtPayload;

        if (!decoded || !decoded.isAdmin) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: "Only admins can register users." }),
            };
        }

        // Generate a JWT token for the new user
        const userAuthToken = jwt.sign(
            { name: newUser.name, isAdmin: newUser.isAdmin },
            JWT_SECRET,
            { expiresIn: "10h" }
        );

        // Store the new user details in DynamoDB
        await dynamoDb
            .put({
                TableName: USER_TABLE_NAME,
                Item: {
                    username: newUser.name,
                    password: newUser.password, 
                    isAdmin: newUser.isAdmin,
                    permissions: newUser.permissions,
                    group: newUser.group,
                    authToken: userAuthToken,
                    callCount: 0,
                    expiresAt: Math.floor(Date.now() / 1000) + 10 * 60 * 60, // 10 hours in seconds
                },
            })
            .promise();

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "User registered successfully.",
                token: `bearer ${userAuthToken}`,
            }),
        };
    } catch (error) {
        console.error("Error registering user:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

// Middleware to validate token and track call count
export async function validateToken(authToken: string): Promise<boolean> {
    try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as jwt.JwtPayload;

        const result = await dynamoDb
            .get({
                TableName: USER_TABLE_NAME,
                Key: { username: decoded.name },
            })
            .promise();

        if (!result.Item) return false;

        const { callCount, expiresAt } = result.Item;
        if (Date.now() / 1000 > expiresAt || callCount >= 1000) return false;

        await dynamoDb
            .update({
                TableName: USER_TABLE_NAME,
                Key: { username: decoded.name },
                UpdateExpression: "SET callCount = callCount + :inc",
                ExpressionAttributeValues: { ":inc": 1 },
            })
            .promise();

        return true;
    } catch (error) {
        console.error("Error validating token:", error);
        return false;
    }
}

// Function to delete user account
export async function deleteUser(authToken: string, username: string): Promise<APIGatewayProxyResult> {
    const decoded = jwt.verify(authToken, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded || (decoded.name !== username && !decoded.isAdmin)) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: "Unauthorized action." }),
        };
    }

    await dynamoDb
        .delete({
            TableName: USER_TABLE_NAME,
            Key: { username },
        })
        .promise();

    return { statusCode: 200, body: JSON.stringify({ message: "User deleted successfully." }) };
}