import { APIGatewayProxyResult } from "aws-lambda";
import {
    NewPackageRequestBody,
    Package,
    PackageID,
    PackageRequestBody,
} from "../types.js";
import {
    performDebloat,
    uploadToS3,
    createPackageService,
    uploadGithubRepoAsZipToS3,
} from "./util/packageUtils.js";
import { BUCKET_NAME, s3 } from "../index.js";

const API_URL =
    "https://lbuuau0feg.execute-api.us-east-1.amazonaws.com/dev/package";

export async function handlePackagePost(
    body: string | null
): Promise<APIGatewayProxyResult> {
    if (!body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is missing" }),
        };
    }

    try {
        console.log("Body:", body);
        const parsedBody: NewPackageRequestBody =
            typeof body === "string" ? JSON.parse(body) : body;
        console.log("Parsed Body:", JSON.parse(parsedBody.body));
        const { metadata, data } = JSON.parse(parsedBody.body);

        // Log incoming data
        console.log("Package metadata:", metadata);
        console.log("Package data:", data);

        // Check required fields in metadata
        if (!metadata || !metadata.Name || !metadata.Version || !metadata.ID) {
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

        // Handle debloat if the option is set
        let contentToUpload = data.Content;
        if (data.Content && data.debloat) {
            console.log("Debloat option is true. Debloating content...");
            contentToUpload = await performDebloat(data.Content);
            console.log("Debloated content:", contentToUpload);
        }

        let s3Url: string | undefined;
        let zipBase64: string | undefined;

        // Upload content to S3 if 'Content' is provided
        if (contentToUpload || data.URL) {
            const fileName = `${metadata.ID}-${metadata.Name}.zip`; // Adjust the extension if needed
            if (data.Content)
                s3Url = await uploadToS3(contentToUpload, fileName);
            else if (data.URL) {
                zipBase64 = await uploadGithubRepoAsZipToS3(data.URL, fileName);
            }
        }

        // Call service function to create package with either URL or S3 URL
        const result = await createPackageService(metadata, {
            ...data,
            ...(data.URL ? { URL: data.URL, content: zipBase64 } : {}),
        });

        console.log("Package creation result:", result);

        return {
            statusCode: 201,
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500, // Return 500 for internal server error
            body: JSON.stringify({
                error: "An error occurred while processing the request",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}

// Function to fetch a package by its ID from the S3 bucket
async function fetchPackageById(id: string): Promise<Package | null> {
    const params = {
        Bucket: BUCKET_NAME,
        Key: `packages/${id}.zip`, // Assuming the package zip files are named <id>.zip
    };

    console.log(
        `Fetching package with ID: ${id} from S3 bucket: ${BUCKET_NAME}`
    );

    try {
        // Try to get the object from S3
        const data = await s3.getObject(params).promise();
        console.log(`Successfully fetched package data for ID: ${id}`);

        // If successful, return the package data
        const packageData: Package = {
            ID: id,
            content: data.Body?.toString("utf-8") || "No content available",
        };

        console.log("Fetched package data:", packageData);
        return packageData;
    } catch (error) {
        console.error(`Error fetching package with ID ${id}:`, error);
        return null; // Return null in case of an error
    }
}

// Handle the GET request for the package/{id} endpoint
export async function handlePackageGet(
    id: string
): Promise<APIGatewayProxyResult> {
    console.log(`Handling GET request for package with ID: ${id}`);

    // Fetch the package by ID
    const packageData = await fetchPackageById(id);

    if (!packageData) {
        console.warn(`Package with ID ${id} not found.`);
        return {
            statusCode: 404,
            body: JSON.stringify({ error: "Package not found" }),
        };
    }

    console.log(`Successfully retrieved package data for ID: ${id}`);
    return {
        statusCode: 200,
        body: JSON.stringify(packageData),
    };
}