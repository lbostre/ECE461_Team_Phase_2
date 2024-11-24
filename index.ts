import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";
import { handlePackagePost, 
         handlePackageGet, 
         handlePackageRate,
       } from "./src/package.js";
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
        const id = pathParameters.id; 
        // /package/{id}/rate 
        if (path === `/package/${id}/rate`) { 
            return handlePackageRate(id);
        }
        // /package/{id}
        else if (path === `/package/${id}`) {  
            return handlePackageGet(id);
        }
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
