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
        console.log("Body:", body);
        return handlePackagePost(body);
    }

    // Handle GET request to /package/{id}
    if (httpMethod === "GET" && pathParameters && pathParameters.id) {
        const id = pathParameters.id; // Access id directly from pathParameters
        return handlePackageGet(id);
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not Found" }),
    };
};
