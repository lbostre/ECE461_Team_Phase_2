import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { handlePackagePost, handlePackageGet } from "./src/package.js";

// Initialize S3 client
export const s3 = new AWS.S3();
export const BUCKET_NAME = "ece461phase2";

export const handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { httpMethod, path, pathParameters, body } = event;

    if (path === "/package" && httpMethod === "POST") {
        return handlePackagePost(body);
    }

    // Handle GET request to /package/{id}
    if (path.startsWith("/package/") && httpMethod === "GET") {
        const id = pathParameters?.id;  
        if (id) {
            return handlePackageGet(id);
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing package ID" }),
            };
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not Found" }),
    };
};
