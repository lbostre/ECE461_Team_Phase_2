import { APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import jwt from "jsonwebtoken";
import { AuthenticationRequest } from "../../types.js";

const USER_TABLE_NAME = "ECE461_UsersTable";
const JWT_SECRET = process.env.JWT_SECRET || "XH8HurGXsbnbCXT/LxJ3MlhIQKfEFeshJTKg2T/DWgw=";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Allow requests from any origin
    "Access-Control-Allow-Methods": "OPTIONS, PUT", // Specify allowed methods
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization", // Specify allowed headers
};

const endpointPermissions: Record<string, string[]> = {
    search: ["/packages", "/package/{id}/rate", "/package/{id}/cost", "/package/byRegEx"],
    upload: ["/package/{id}", "/package"],
    download: ["/package/{id}"]
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
        if (user.expiresAt > Math.floor(Date.now() / 1000) && user.callCount <= 1000 && user.authToken) {
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
export async function validateToken(
    authToken: string,
    dynamoDb: DynamoDBDocumentClient,
    currentPath: string
): Promise<{ isValid: boolean; error?: string }> {
    try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as jwt.JwtPayload;

        // Fetch the user from the database
        const result = await dynamoDb.send(
            new GetCommand({
                TableName: USER_TABLE_NAME,
                Key: { username: decoded.name }
            })
        );

        if (!result.Item) {
            return { isValid: false, error: "User not found." };
        }

        const { callCount, expiresAt, permissions } = result.Item;

        // Check if the token is expired or call count exceeded
        if (Date.now() / 1000 > expiresAt) {
            return { isValid: false, error: "Token has expired." };
        }

        if (callCount >= 1000) {
            return { isValid: false, error: "API call limit exceeded." };
        }

        // Validate if the user has the appropriate permissions for the endpoint
        const userPermissions: string[] = permissions || [];
        let requiresPermission = false;
        let hasPermission = false;

        // Check if the endpoint is listed in `endpointPermissions`
        for (const permission of Object.keys(endpointPermissions)) {
            if (
                endpointPermissions[permission].some((endpoint) => {
                    const pattern = endpoint.replace(/{id}/g, "\\w+"); // Replace {id} with a regex placeholder
                    const regex = new RegExp(`^${pattern}$`);
                    return regex.test(currentPath);
                })
            ) {
                requiresPermission = true;
                hasPermission = userPermissions.includes(permission);
                break;
            }
        }

        // If the endpoint requires permission and the user does not have it, deny access
        if (requiresPermission && !hasPermission) {
            return { isValid: false, error: "User does not have permission for this endpoint." };
        }

        // Increment the API call count
        await dynamoDb.send(
            new UpdateCommand({
                TableName: USER_TABLE_NAME,
                Key: { username: decoded.name },
                UpdateExpression: "SET callCount = callCount + :inc",
                ExpressionAttributeValues: { ":inc": 1 }
            })
        );

        return { isValid: true };
    } catch (error) {
        console.error("Error validating token:", error);
        return { isValid: false, error: "Token validation failed." };
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

export async function handleGetUser(
    authToken: string,
    dynamoDb: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        const token = authToken.replace("bearer ", "").trim();
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

        // Verify if the decoded token contains a valid name
        if (!decoded || !decoded.name) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }

        // Fetch the user data from DynamoDB using the username
        const result = await dynamoDb.send(new GetCommand({
            TableName: USER_TABLE_NAME,
            Key: { username: decoded.name },
        }));

        if (!result.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "User not found." }),
            };
        }

        const user = result.Item;
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                User: {
                    name: user.username,
                    password: user.password,
                    isAdmin: user.isAdmin,
                    permissions: user.permissions,
                    group: user.group,
                },
            }),
        };
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }
        console.error("Error fetching user data:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

export async function getGroups(
    authToken: string,
    dynamoDb: DynamoDBDocumentClient
): Promise<string | null> {
    try {
        // Verify and decode the JWT token
        const decoded = jwt.verify(authToken.replace("bearer ", "").trim(), JWT_SECRET) as jwt.JwtPayload;

        if (!decoded || !decoded.name) {
            console.error("Invalid token or missing username.");
            return null;
        }

        // Query DynamoDB to fetch the user data
        const result = await dynamoDb.send(
            new GetCommand({
                TableName: USER_TABLE_NAME,
                Key: { username: decoded.name },
            })
        );

        if (!result.Item) {
            console.error("User not found in the database.");
            return null;
        }

        // Return the group name if available
        return result.Item.group || null;
    } catch (error) {
        console.error("Error retrieving group:", error);
        return null;
    }
}

export async function handleReset(
    authToken: string,
    dynamoDb: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        // Check if the user is an admin
        const decoded = jwt.verify(authToken, JWT_SECRET) as jwt.JwtPayload;
        if (!decoded.isAdmin) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: "You do not have permission to reset the registry." }),
            };
        }

        // Clear tables and handle errors
        const clear_results = await Promise.all([
            clearTable("ECE461_UsersTable", dynamoDb),
            clearTable("ECE461_PackagesTable", dynamoDb),
            clearTable("ECE461_CostsTable", dynamoDb),
        ]);
        if (clear_results.some((result) => result instanceof Error)) {
            throw new Error("Error clearing tables.");
        }

        const defaultAdmin = {
            username: "ece30861defaultadminuser",
            password: "correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;",
            isAdmin: true,
            permissions: ["search", "upload", "download"],
            callCount: 0,
            expiresAt: Math.floor(Date.now() / 1000) + 10 * 60 * 60, 
        };

        await dynamoDb.send(new PutCommand({
            TableName: "ECE461_UsersTable",
            Item: defaultAdmin,
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Registry is reset." }),
        };
    } catch (error) {
        console.error("Error resetting the registry:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Internal Server Error",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}

// Helper function to clear a table
export async function clearTable(tableName: string, dynamoDb: DynamoDBDocumentClient): Promise<void> {
    try {
        let items;
        do {
            const scanCommand = new ScanCommand({ TableName: tableName });
            const response = await dynamoDb.send(scanCommand);
            items = response.Items;

            if (items && items.length > 0) {
                for (const item of items) {
                    const deleteCommand = new DeleteCommand({
                        TableName: tableName,
                        Key: { username: item.username || item.ECEfoursixone }, // Adjust key based on table
                    });
                    await dynamoDb.send(deleteCommand);
                }
            }
        } while (items && items.length > 0);
    } catch (error) {
        console.error(`Error clearing table ${tableName}:`, error);
        throw error;
    }
}

export async function getUserInfo(authToken: string, dynamoDb: DynamoDBDocumentClient) {
    try {
        const token = authToken.replace("bearer ", "").trim();
        const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

        // Verify if the decoded token contains a valid name
        if (!decoded || !decoded.name) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Authentication failed due to invalid or missing AuthenticationToken." }),
            };
        }

        // Fetch the user data from DynamoDB using the username
        const result = await dynamoDb.send(new GetCommand({
            TableName: USER_TABLE_NAME,
            Key: { username: decoded.name },
        }));

        if (!result.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "User not found." }),
            };
        }

        const user = result.Item;
        return user;
    } catch (error) {
        console.error("Error resetting the registry:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Internal Server Error",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}