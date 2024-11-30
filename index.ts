import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { handlePackagePost, handlePackageGet, handlePackageRate } from "./src/package.js";

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
    if (httpMethod === "GET" && pathParameters && pathParameters.id) {
        const id = pathParameters.id; // Access id directly from pathParameters
        // Check for /rate in the path to determine whether to return metrics
        if (path === `/package/${id}/rate`) {
            return handlePackageRate(id);
        }
        else if (path === `/package/${id}`) {
            return handlePackageGet(id);
        }
    }

    // --- 501 Not Implemented --- //

    // Handle /packages (POST)
    if (path === "/packages" && httpMethod === "POST") {
        // Return not implemented for now
        return {
            statusCode: 501,
            body: JSON.stringify({ error: "Not Implemented" }),
        };
    }

    // Handle /reset (DELETE)
    if (path === "/reset" && httpMethod === "DELETE") {
        // Return not implemented for now
        return {
            statusCode: 501,
            body: JSON.stringify({ error: "Not Implemented" }),
        };
    }


    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not Found" }),
    };
};
