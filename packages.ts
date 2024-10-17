import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PackageData, PackageMetadata } from "./types.js";

export const generateUniqueId = (): string => {
    // Use a UUID library or custom logic to generate a unique ID
    return uuidv4();
};

export const createPackageService = async (data: PackageData) => {
    // Logic for creating a new package, validating data, and saving to DB
    const newPackage = { ...data, id: generateUniqueId() }; // Example logic
    // Save to the database (you need to implement this)
    return newPackage;
};

export const createPackage = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // Parse the request body
        const packageData: PackageData = JSON.parse(event.body || "{}");

        // Validate metadata
        const metadata = packageData as PackageMetadata;
        const data = packageData;

        // Check required fields in metadata
        if (!metadata || !metadata.Name || !metadata.Version || !metadata.ID) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Package metadata is missing required fields (Name, Version, ID)",
                }),
            };
        }

        // Check for Content or URL in data (only one can be set)
        if (data && data.Content && data.URL) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Both Content and URL cannot be set",
                }),
            };
        }

        // Call your service logic
        const result = await createPackageService(packageData);

        // Return a successful response
        return {
            statusCode: 201,
            body: JSON.stringify(result),
        };
    } catch (error) {
        const errMessage =
            error instanceof Error ? error.message : "Unknown error";

        // Return an error response
        return {
            statusCode: 400,
            body: JSON.stringify({ error: errMessage }),
        };
    }
};

function uuidv4(): string {
    // Generate a random UUID v4
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
