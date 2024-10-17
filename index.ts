import { createPackageService } from "./packages";
import { PackageData, PackageMetadata } from "./types";
import AWS from "aws-sdk";
import { minify } from "terser";

// Initialize S3 client
const s3 = new AWS.S3();

// Define your S3 bucket name
const BUCKET_NAME = "ece461phase2";

// Function to upload content to S3
const uploadToS3 = async (
    content: string,
    fileName: string
): Promise<string> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: `packages/${fileName}`, // file path in S3
        Body: content,
        ContentType: "application/octet-stream", // Adjust content type based on your needs
    };

    const data = await s3.upload(params).promise();
    return data.Location; // Return the S3 URL
};

// Perform debloating (minification) on JavaScript content
async function performDebloat(content: string): Promise<string> {
    const result = await minify(content);
    return result.code || content;
}

interface APIGatewayEvent {
    httpMethod: string;
    path: string;
    body: string | null;
}

interface PackageRequestBody {
    metadata: PackageMetadata;
    data: PackageData;
}

interface APIGatewayResponse {
    statusCode: number;
    headers?: { [key: string]: string };
    body: string;
}

exports.handler = async (
    event: APIGatewayEvent
): Promise<APIGatewayResponse> => {
    const { httpMethod, path, body } = event;

    if (path === "/package" && httpMethod === "POST") {
        if (!body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Request body is missing" }),
            };
        }

        try {
            const parsedBody: PackageRequestBody =
                typeof body === "string" ? JSON.parse(body) : body;
            const { metadata, data } = parsedBody;

            // Check required fields in metadata
            if (
                !metadata ||
                !metadata.Name ||
                !metadata.Version ||
                !metadata.ID
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "Package metadata is missing required fields (Name, Version, ID)",
                    }),
                };
            }

            // Check content or URL in data (only one can be set)
            if (data && data.Content && data.URL) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: "Both Content and URL cannot be set",
                    }),
                };
            }

            let s3Url: string | undefined;

            // Upload content to S3 if 'Content' is provided
            if (data.Content) {
                // Check if debloating is requested
                let contentToUpload = data.Content;

                if (data.debloat) {
                    console.log("Debloating the package content...");
                    contentToUpload = await performDebloat(contentToUpload);
                }

                // Generate a unique filename for the content (could be metadata.ID + file extension)
                const fileName = `${metadata.ID}-${metadata.Name}.zip`; // Adjust the extension if needed
                s3Url = await uploadToS3(contentToUpload, fileName);
            }

            // Call service function to create package with either URL or S3 URL
            const result = await createPackageService({
                ...data,
                URL: data.URL || s3Url, // Use the provided URL or the S3 URL if content was uploaded
            });

            return {
                statusCode: 201,
                body: JSON.stringify(result),
            };
        } catch (error) {
            console.error("Error:", error);
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Invalid JSON in request body or S3 upload failed",
                }),
            };
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not Found" }),
    };
};
