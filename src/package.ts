import { APIGatewayProxyResult } from "aws-lambda";
import { RepoDataResult } from "../types.js";
import {
    performDebloat,
    uploadToS3,
    createPackageService,
    uploadGithubRepoAsZipToS3,
    getRepositoryVersion,
    extractPackageJsonUrl,
    extractVersionFromPackageJson,
    fetchPackageById,
    fetchCostWithGraphQL,
} from "./util/packageUtils.js";
import { getGithubUrlFromNpm } from "./util/repoUtils.js";
import { getRepoData } from "./main.js";
import { PutCommand, GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import semver from "semver";
import { s3Client } from "../index.js";

const TABLE_NAME = "ECE461_Database";
const COST_TABLE_NAME = "ECE461_CostTable";
const BUCKET_NAME = "ece461phase2";

const API_URL = "https://lbuuau0feg.execute-api.us-east-1.amazonaws.com/dev/package";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
};

export async function handlePackagePost(
    body: any,
    s3Client: S3Client,
    dynamoDb: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    if (!body) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Request body is missing" }),
        };
    }

    try {
        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        console.log("Body:", body);
        const data = {
            JSProgram: body.JSProgram,
            URL: body.URL,
            Content: body.Content,
            debloat: body.debloat,
            Name: body.Name,
        };

        console.log("Package data:", data);
        let name = "";

        if (data && data.Content && data.URL) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Both Content and URL cannot be set",
                }),
            };
        }

        let contentToUpload = data.Content;
        if (data.Content && data.debloat) {
            console.log("Debloat option is true. Debloating content...");
            try {
                contentToUpload = await performDebloat(data.Content);
                console.log("Debloated content:", contentToUpload);
            } catch (debloatError) {
                console.error("Debloat function failed:", debloatError);
                throw new Error("Debloat function failed");
            }
        }

        let s3Url: string | undefined;
        let zipBase64: string | undefined;
        let version: string = "1.0.0";
        let metricsResult: RepoDataResult | null = null;
        let url = "";

        if (contentToUpload || data.URL) {
            try {
                if (data.Content) {
                    const URL = await extractPackageJsonUrl(data.Content);
                    version = await extractVersionFromPackageJson(data.Content);
                    name = `${data.Name}`;
                    const fileName = `${data.Name}${version.replace(/\./g, "")}.zip`;
                    if (URL != null) {
                        metricsResult = await getRepoData(URL);
                        if (metricsResult && metricsResult.NetScore >= 0.5) {
                            s3Url = await uploadToS3(contentToUpload, fileName, s3Client, BUCKET_NAME);
                            url = URL;
                            version = await extractVersionFromPackageJson(data.Content);
                        } else {
                            return {
                                statusCode: 424,
                                headers: {
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Methods": "POST",
                                    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
                                },
                                body: JSON.stringify({
                                    error: "Package is not uploaded due to the disqualified rating.",
                                }),
                            };
                        }
                    }
                } else if (data.URL) {
                    let githubURL = data.URL;
                    if (/^(npm:|https?:\/\/(www\.)?npmjs\.com\/)/.test(githubURL)) {
                        githubURL = await getGithubUrlFromNpm(githubURL);
                        version = await getRepositoryVersion(githubURL);
                    } else {
                        version = await getRepositoryVersion(data.URL);
                    }
                    name = `${githubURL.split("/").pop()}`;
                    const fileName = `${githubURL.split("/").pop()}${version.replace(/\./g, "")}.zip`;
                    metricsResult = await getRepoData(githubURL);
                    if (metricsResult && metricsResult.NetScore >= 0.5) {
                        zipBase64 = await uploadGithubRepoAsZipToS3(githubURL, fileName, s3Client, BUCKET_NAME);
                        url = githubURL;
                    } else {
                        return {
                            statusCode: 424,
                            headers: corsHeaders,
                            body: JSON.stringify({
                                error: "Package is not uploaded due to the disqualified rating.",
                            }),
                        };
                    }
                }
            } catch (uploadError) {
                console.error("Upload to S3 or GitHub processing failed:", uploadError);
                throw new Error("Failed to upload content to S3 or process GitHub repo");
            }
        }
        const { debloat, ...dataWithoutDebloat } = data;
        const result = await createPackageService(
            name,
            {
                ...dataWithoutDebloat,
                ...(data.URL ? { URL: data.URL, content: zipBase64 } : {}),
            },
            version
        );

        console.log("Package creation result:", result);

        if (metricsResult && metricsResult.NetScore >= 0.5) {
            if (zipBase64 || s3Url) {
                try {
                    const dynamoParams = {
                        TableName: TABLE_NAME,
                        Item: {
                            ECEfoursixone: result.metadata.ID,
                            Version: version,
                            URL: url,
                            JSProgram: data.JSProgram,
                            Metrics: metricsResult,
                        },
                    };
                    await dynamoDb.send(new PutCommand(dynamoParams));
                    console.log("Metrics successfully stored in DynamoDB.");
                } catch (error) {
                    console.error("Error storing metrics in DynamoDB:", error);
                    return {
                        statusCode: 500,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: "Failed to store metrics in DynamoDB",
                            details: error instanceof Error ? error.message : String(error),
                        }),
                    };
                }
            }
        }

        return {
            statusCode: 201,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
            },
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
            },
            body: JSON.stringify({
                error: "An error occurred while processing the request",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}

// Handle the GET request for the package/{id} endpoint
export async function handlePackageGet(
    id: string,
    dynamoDb: DynamoDBDocumentClient,
    s3Client: S3Client,
    bucketName: string
): Promise<APIGatewayProxyResult> {
    console.log(`Handling GET request for package with ID: ${id}`);

    const packageData = await fetchPackageById(id, dynamoDb, s3Client, bucketName);

    if (!packageData) {
        console.warn(`Package with ID ${id} not found.`);
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Package not found" }),
        };
    }

    console.log(`Successfully retrieved package data for ID: ${id}`);
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(packageData),
    };
}

export async function handlePackageRate(
    id: string,
    dynamoDbClient: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        console.log(
            `Fetching metrics for package with ID: ${id} from DynamoDB`
        );

        const dynamoResult = await dynamoDbClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { ECEfoursixone: id },
            ProjectionExpression: "#metrics",
            ExpressionAttributeNames: {
                "#metrics": "Metrics",
            },
        }));

        if (!dynamoResult.Item) {
            console.warn(`No metrics found for package with ID: ${id}`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Metrics not found for this package",
                }),
            };
        }

        const metrics = dynamoResult.Item.Metrics;
        console.log("Retrieved metrics:", metrics);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ PackageRating: metrics }),
        };
    } catch (error) {
        console.error(
            `Error fetching metrics for package with ID ${id}:`,
            error
        );
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Failed to fetch metrics",
            }),
        };
    }
}

export async function handlePackageCost(
    id: string,
    includeDependencies: boolean,
    dynamoDbClient: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        // Check if cost data exists in the Cost Table
        const costData = await dynamoDbClient.send(new GetCommand({
            TableName: COST_TABLE_NAME,
            Key: { packageID: id },
        }));

        if (costData.Item) {
            const { standaloneCost, totalCost } = costData.Item;
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    [id]: includeDependencies
                        ? { standaloneCost, totalCost }
                        : { standaloneCost },
                }),
            };
        }

        // Fetch package data from the main table
        const packageData = await dynamoDbClient.send(new GetCommand({
            TableName: "ECE461_Database",
            Key: { ECEfoursixone: id },
        }));

        if (!packageData.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Package does not exist." }),
            };
        }

        const repoUrl = packageData.Item.URL;

        if (!repoUrl) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Missing repository URL." }),
            };
        }

        // Use GraphQL API to fetch size and dependencies
        const { standaloneCost, totalCost, dependencies } =
            await fetchCostWithGraphQL(repoUrl, includeDependencies);

        // Write the package's cost data to the database
        await dynamoDbClient.send(new PutCommand({
            TableName: "ECE461_CostTable",
            Item: {
                packageID: id,
                standaloneCost,
                totalCost,
            },
        }));

        // Write dependency costs to the database
        for (const [dependencyId, costData] of Object.entries(dependencies)) {
            await dynamoDbClient.send(new PutCommand({
                TableName: "ECE461_CostTable",
                Item: {
                    packageID: dependencyId,
                    standaloneCost: costData.standaloneCost,
                    totalCost: costData.totalCost,
                },
            }));
        }

        // Construct the response
        const response = {
            [id]: { standaloneCost, totalCost },
            ...dependencies,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(response),
        };
    } catch (error) {
        console.error("Error calculating package cost:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Error calculating package cost." }),
        };
    }
}

export async function handlePackageUpdate(
    id: string,
    body: string,
    dynamoDb: DynamoDBDocumentClient,
    s3Client: S3Client
): Promise<APIGatewayProxyResult> {
    try {
        if (!body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "There is missing field(s) in the request body.",
                }),
            };
        }

        const requestBody = JSON.parse(body);
        const { metadata, data } = requestBody;

        if (
            !metadata?.ID ||
            !metadata?.Version ||
            !data?.Content ||
            (!data?.URL && !data?.Content)
        ) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "There is missing field(s) in the PackageID or it is formed improperly.",
                }),
            };
        }

        // Retrieve the current package details using the provided `id`
        const getCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { ECEfoursixone: id },
        });
        const currentPackageResult = await dynamoDb.send(getCommand);

        if (!currentPackageResult.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Package does not exist." }),
            };
        }

        const currentPackage = currentPackageResult.Item;

        // Validate the new version against the existing package version
        const currentVersion = currentPackage.Version;
        if (!semver.gt(metadata.Version, currentVersion)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "The provided version is not newer than the existing version.",
                }),
            };
        }

        // Run debloat if applicable
        let contentToUpload = data.Content;
        if (data.Content && data.debloat) {
            console.log("Debloat option is true. Debloating content...");
            contentToUpload = await performDebloat(data.Content);
        }

        let metricsResult: RepoDataResult | null = null;
        let s3Url: string | undefined;

        // Run metrics and upload the package to S3
        if (contentToUpload || data.URL) {
            try {
                const url = data.URL || (await extractPackageJsonUrl(contentToUpload));
                const metrics = await getRepoData(url);

                if (metrics && metrics.NetScore >= 0.5) {
                    const fileName = `${metadata.Name}${metadata.Version.replace(/\./g, "")}.zip`;
                    s3Url = await uploadToS3(contentToUpload, fileName, s3Client, BUCKET_NAME);
                    metricsResult = metrics;
                } else {
                    return {
                        statusCode: 424,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            error: "Package is not uploaded due to the disqualified rating.",
                        }),
                    };
                }
            } catch (error) {
                console.error("Error processing metrics or uploading to S3:", error);
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: "An error occurred while running metrics or uploading to S3.",
                    }),
                };
            }
        }

        // Store the new version in the database
        const newPackage = {
            ECEfoursixone: metadata.ID, // New unique ID for the new version
            Version: metadata.Version,
            URL: data.URL || null,
            JSProgram: data.JSProgram || null,
            Metrics: metricsResult,
        };

        const putCommand = new PutCommand({
            TableName: TABLE_NAME,
            Item: newPackage,
        });

        await dynamoDb.send(putCommand);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Version is updated." }),
        };
    } catch (error) {
        console.error("Error updating package version:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Internal Server Error",
            }),
        };
    }
}