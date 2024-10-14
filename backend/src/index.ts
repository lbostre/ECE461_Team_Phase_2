import { createPackageService } from "./packages";
import { PackageData, PackageMetadata } from "./types";

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

            // Call service function to create package (dummy function here)
            const result = await createPackageService(data);

            return {
                statusCode: 201,
                body: JSON.stringify(result),
            };
        } catch (error) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "Invalid JSON in request body",
                }),
            };
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: "Not Found" }),
    };
};
