import { APIGatewayProxyResult } from "aws-lambda";
import {
    NewPackageRequestBody,
    Package,
    PackageID,
    PackageRequestBody,
    RepoDataResult,
    PackageMetadata, 
    PackageData,
} from "../types.js";
import {
    performDebloat,
    uploadToS3,
    createPackageService,
    uploadGithubRepoAsZipToS3,
    getRepositoryVersion,
    extractPackageJsonUrl,
    extractVersionFromPackageJson,
    fetchPackageById,
} from "./util/packageUtils.js";
import { BUCKET_NAME, s3 } from "../index.js";
import { getGithubUrlFromNpm } from "./util/repoUtils.js";
import { getRepoData } from "./main.js";
import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'ECE461_Database';

const API_URL =
    "https://lbuuau0feg.execute-api.us-east-1.amazonaws.com/dev/package";

export async function handlePackagePost(
    body: any
): Promise<APIGatewayProxyResult> {
    if (!body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is missing" }),
        };
    }

    try {
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        console.log("Body:", body);
        const data = {
            JSProgram: body.JSProgram,
            URL: body.URL,
            Content: body.Content,
            debloat: body.debloat,
            Name: body.Name
        };

        console.log("Package data:", data);
        let name = "";

        if (data && data.Content && data.URL) {
            return {
                statusCode: 400,
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
            const fileName = `${name}.zip`;
            try {
                if (data.Content) {
                    const URL = await extractPackageJsonUrl(data.Content);
                    if (URL != null) {
                        metricsResult = await getRepoData(URL);
                        if (metricsResult && metricsResult.NetScore >= 0.5) {
                            s3Url = await uploadToS3(contentToUpload, fileName);
                            name = data.Name;
                            url = URL;
                            version = await extractVersionFromPackageJson(data.Content);
                        }
                        else {
                            return {
                                statusCode: 424,
                                body: JSON.stringify({
                                    error: "Package is not uploaded due to the disqualified rating.",
                                }),
                            };
                        }
                    }
                } else if (data.URL) {
                    let githubURL = data.URL;
                    if (
                        /^(npm:|https?:\/\/(www\.)?npmjs\.com\/)/.test(
                            githubURL
                        )
                    ) {
                        githubURL = await getGithubUrlFromNpm(githubURL);
                        version = await getRepositoryVersion(githubURL);
                    } else {
                        version = await getRepositoryVersion(data.URL);
                    }
                    metricsResult = await getRepoData(data.URL);
                    if (metricsResult && metricsResult.NetScore >= 0.5) {
                        zipBase64 = await uploadGithubRepoAsZipToS3(
                            githubURL,
                            fileName
                        );
                        name = data.URL.split("/").pop();
                        url = githubURL;
                    }
                    else {
                        return {
                            statusCode: 424,
                            body: JSON.stringify({
                                error: "Package is not uploaded due to the disqualified rating.",
                            }),
                        };
                    }
                }
            } catch (uploadError) {
                console.error(
                    "Upload to S3 or GitHub processing failed:",
                    uploadError
                );
                throw new Error(
                    "Failed to upload content to S3 or process GitHub repo"
                );
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
                            Metrics: metricsResult       
                        },
                    };
                    await dynamoDb.put(dynamoParams).promise();
                    console.log("Metrics successfully stored in DynamoDB.");
                } catch (error) {
                    console.error("Error storing metrics in DynamoDB:", error);
                    return {
                        statusCode: 500,
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
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "An error occurred while processing the request",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}

// Handle the GET request for the package/{id} endpoint
export async function handlePackageGet(id: string): Promise<APIGatewayProxyResult> {
    console.log(`Handling GET request for package with ID: ${id}`);

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
