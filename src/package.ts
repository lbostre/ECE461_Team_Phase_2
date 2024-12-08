import { APIGatewayProxyResult } from "aws-lambda";
import { PackageQuery, RepoDataResult } from "../types.js";
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
    getTildePackages,
    getCaratPackages,
    getBoundedRangePackages,
    getExactPackage,
    getAllPackages,
    fetchReadmesBatch,
    updateHistory,
} from "./util/packageUtils.js";
import { getGroups, getUserInfo } from "./util/authUtil.js";
import { getGithubUrlFromNpm } from "./util/repoUtils.js";
import { getRepoData } from "./main.js";
import {
    PutCommand,
    GetCommand,
    DynamoDBDocumentClient,
    ScanCommand,
    QueryCommand,
    DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import semver from "semver";

const TABLE_NAME = "ECE461_Database";
const COST_TABLE_NAME = "ECE461_CostTable";
const BUCKET_NAME = "ece461phase2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
};

export async function handlePackagePost(
    body: any,
    s3Client: S3Client,
    dynamoDb: DynamoDBDocumentClient,
    authToken: string
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
            Secret: body.Secret,
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
                    const fileName = `${data.Name}${version.replace(
                        /\./g,
                        ""
                    )}.zip`;
                    const existingPackage = await dynamoDb.send(
                        new GetCommand({
                            TableName: TABLE_NAME,
                            Key: {
                                ECEfoursixone: fileName.replace(".zip", ""),
                            },
                        })
                    );
                    if (existingPackage.Item) {
                        return {
                            statusCode: 409,
                            headers: corsHeaders,
                            body: JSON.stringify({
                                error: "Package already exists.",
                            }),
                        };
                    }
                    if (URL != null) {
                        metricsResult = await getRepoData(URL);
                        if (metricsResult && metricsResult.NetScore >= 0.5) {
                            s3Url = await uploadToS3(
                                contentToUpload,
                                fileName,
                                s3Client,
                                BUCKET_NAME
                            );
                            url = URL;
                            version = await extractVersionFromPackageJson(
                                data.Content
                            );
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
                    name = `${data.Name}`;
                    const fileName = `${data.Name}${version.replace(
                        /\./g,
                        ""
                    )}.zip`;
                    const existingPackage = await dynamoDb.send(
                        new GetCommand({
                            TableName: TABLE_NAME,
                            Key: {
                                ECEfoursixone: fileName.replace(".zip", ""),
                            },
                        })
                    );
                    if (existingPackage.Item) {
                        return {
                            statusCode: 409,
                            headers: corsHeaders,
                            body: JSON.stringify({
                                error: "Package already exists.",
                            }),
                        };
                    }
                    metricsResult = await getRepoData(githubURL);
                    if (metricsResult && metricsResult.NetScore >= 0.5) {
                        zipBase64 = await uploadGithubRepoAsZipToS3(
                            githubURL,
                            fileName,
                            s3Client,
                            BUCKET_NAME
                        );
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
                ...(data.URL ? { Content: zipBase64, URL: data.URL, JSProgram: data.JSProgram} : {}),
            },
            version
        );

        console.log("Package creation result:", result);

        let group = null;

        // Check if Secret is true and retrieve the group
        if (data.Secret === true) {
            group = await getGroups(authToken, dynamoDb);
            if (!group) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: "User group could not be retrieved",
                    }),
                };
            }
        }

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
                            Group: group,
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
                            details:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        }),
                    };
                }
            }
        }

        try {
            console.log(
                `Updating history for deleted package: ${result.metadata.ID}`
            );
            await updateHistory(
                dynamoDb,
                authToken,
                {
                    Name: name.replace(/\d+$/, ""),
                    Version: version,
                    ID: result.metadata.ID,
                },
                "CREATE"
            );
            console.log("History updated successfully.");
        } catch (historyError) {
            console.error("Error updating history:", historyError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to update history for the deleted package.",
                }),
            };
        }

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify(result),
        };
    } catch (error) {
        if (error instanceof SyntaxError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Invalid JSON in request body.",
                }),
            };
        }
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "An error occurred while processing the request",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}

export async function handlePackageGet(
    id: string,
    dynamoDb: DynamoDBDocumentClient,
    s3Client: S3Client,
    bucketName: string,
    authToken: string
): Promise<APIGatewayProxyResult> {
    console.log(`Handling GET request for package with ID: ${id}`);

    try {
        const packageData = await fetchPackageById(
            id,
            dynamoDb,
            s3Client,
            bucketName,
            authToken
        );

        if (!packageData) {
            console.warn(`Package with ID ${id} not found.`);
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Package not found" }),
            };
        }

        try {
            console.log(`Updating history for deleted package: ${id}`);
            if (packageData && packageData.metadata && packageData.data) {
                await updateHistory(
                    dynamoDb,
                    authToken,
                    {
                        Name: packageData.metadata.Name,
                        Version: packageData.metadata.Version,
                        ID: id,
                    },
                    "DOWNLOAD"
                );
                console.log("History updated successfully.");
            }
        } catch (historyError) {
            console.error("Error updating history:", historyError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to update history for the deleted package.",
                }),
            };
        }

        console.log(`Successfully retrieved package data for ID: ${id}`);
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(packageData),
        };
    } catch (error) {
        console.error(`Error fetching package with ID ${id}:`, error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

export async function handlePackageRate(
    id: string,
    dynamoDbClient: DynamoDBDocumentClient,
    authToken: string
): Promise<APIGatewayProxyResult> {
    try {
        console.log(
            `Fetching metrics for package with ID: ${id} from DynamoDB`
        );

        const dynamoResult = await dynamoDbClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { ECEfoursixone: id },
            })
        );

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

        // Map the metrics to the desired order
        const orderedMetrics = {
            BusFactor: metrics.BusFactor,
            BusFactorLatency: metrics.BusFactorLatency,
            Correctness: metrics.Correctness,
            CorrectnessLatency: metrics.CorrectnessLatency,
            RampUp: metrics.RampUp,
            RampUpLatency: metrics.RampUpLatency,
            ResponsiveMaintainer: metrics.ResponsiveMaintainer,
            ResponsiveMaintainerLatency: metrics.ResponsiveMaintainerLatency,
            LicenseScore: metrics.LicenseScore,
            LicenseScoreLatency: metrics.LicenseScoreLatency,
            GoodPinningPractice: metrics.GoodPinningPractice,
            GoodPinningPracticeLatency: metrics.GoodPinningPracticeLatency,
            PullRequest: metrics.PullRequest,
            PullRequestLatency: metrics.PullRequestLatency,
            NetScore: metrics.NetScore,
            NetScoreLatency: metrics.NetScoreLatency,
        };

        console.log("Ordered metrics:", orderedMetrics);

        try {
            console.log(`Updating history for deleted package: ${id}`);
            if (dynamoResult && dynamoResult.Item.Version) {
                await updateHistory(
                    dynamoDbClient,
                    authToken,
                    {
                        Name: id.replace(/\d+$/, ""),
                        Version: dynamoResult.Item.Version,
                        ID: id,
                    },
                    "RATE"
                );
                console.log("History updated successfully.");
            }
        } catch (historyError) {
            console.error("Error updating history:", historyError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to update history for the deleted package.",
                }),
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(orderedMetrics),
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
        const costData = await dynamoDbClient.send(
            new GetCommand({
                TableName: COST_TABLE_NAME,
                Key: { packageID: id },
            })
        );

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
        const packageData = await dynamoDbClient.send(
            new GetCommand({
                TableName: "ECE461_Database",
                Key: { ECEfoursixone: id },
            })
        );

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
        await dynamoDbClient.send(
            new PutCommand({
                TableName: "ECE461_CostTable",
                Item: {
                    packageID: id,
                    standaloneCost,
                    totalCost,
                },
            })
        );

        // Write dependency costs to the database
        for (const [dependencyId, costData] of Object.entries(dependencies)) {
            await dynamoDbClient.send(
                new PutCommand({
                    TableName: "ECE461_CostTable",
                    Item: {
                        packageID: dependencyId,
                        standaloneCost: costData.standaloneCost,
                        totalCost: costData.totalCost,
                    },
                })
            );
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
    s3Client: S3Client,
    authToken: string
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

        let requestBody;
        try {
            requestBody = JSON.parse(body);
        } catch (error) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Invalid JSON in request body.",
                }),
            };
        }
        const { metadata, data, Secret } = requestBody;

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
        let group: string | null = null;

        // Handle `Secret` and retrieve user group
        if (Secret === true) {
            group = await getGroups(authToken, dynamoDb);
            if (!group) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        error: "User group could not be retrieved",
                    }),
                };
            }
        }

        // Run metrics and upload the package to S3
        if (contentToUpload || data.URL) {
            try {
                const url =
                    data.URL || (await extractPackageJsonUrl(contentToUpload));
                const metrics = await getRepoData(url);

                if (metrics && metrics.NetScore >= 0.5) {
                    const fileName = `${
                        metadata.Name
                    }${metadata.Version.replace(/\./g, "")}.zip`;
                    s3Url = await uploadToS3(
                        contentToUpload,
                        fileName,
                        s3Client,
                        BUCKET_NAME
                    );
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
                console.error(
                    "Error processing metrics or uploading to S3:",
                    error
                );
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
            Group: group, // Add group if Secret was true
        };

        const putCommand = new PutCommand({
            TableName: TABLE_NAME,
            Item: newPackage,
        });

        await dynamoDb.send(putCommand);

        try {
            console.log(`Updating history for deleted package: ${id}`);
            await updateHistory(
                dynamoDb,
                authToken,
                {
                    Name: id.replace(/\d+$/, ""),
                    Version: metadata.Version,
                    ID: id,
                },
                "UPDATE"
            );
            console.log("History updated successfully.");
        } catch (historyError) {
            console.error("Error updating history:", historyError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to update history for the deleted package.",
                }),
            };
        }

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

export const handlePackagesList = async (
    body: string | null,
    offset: number,
    dynamoDb: DynamoDBDocumentClient
) => {
    if (!body) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid.",
            }),
        };
    }

    let packagesQuery: PackageQuery[];
    try {
        packagesQuery = JSON.parse(body);
    } catch (error) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Invalid JSON in request body.",
            }),
        };
    }

    if (!Array.isArray(packagesQuery) || packagesQuery.length === 0) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "There is missing field(s) in the PackageQuery or it is formed improperly, or is invalid.",
            }),
        };
    }

    let results: any[] = [];

    // Iterate over each query to collect results
    for (const query of packagesQuery) {
        if (query.Name === "*") {
            // If Name is '*', return all packages in the database
            const allPackages = await getAllPackages(dynamoDb);
            results.push(...allPackages);
        } else if (query.Name && !query.Version) {
            try {
                const params = {
                    TableName: "ECE461_Database",
                };

                const command = new ScanCommand(params);
                const response = await dynamoDb.send(command);

                const items = response.Items || [];

                // Filter items matching the provided name and map to expected structure
                const matchingPackages = items
                    .filter((item: any) => {
                        const packageName = item.ECEfoursixone.replace(
                            /\d.*/,
                            ""
                        ); // Extract name from packageID
                        return packageName === query.Name.toLowerCase();
                    })
                    .map((item: any) => ({
                        Version: item.Version,
                        Name: query.Name,
                        ID: item.ECEfoursixone,
                    }));

                results.push(...matchingPackages);
            } catch (error) {
                console.error("Error scanning table for package name:", error);
            }
        } else if (query.Version && query.Name) {
            // Handle different version queries: Exact, Bounded Range, Carat, Tilde
            if (query.Version.toLowerCase().includes("exact".toLowerCase())) {
                const version = query.Version.match(/\(([^)]+)\)/)?.[1];
                if (version) {
                    const exactPackage = await getExactPackage(
                        query.Name,
                        version,
                        dynamoDb
                    );
                    if (exactPackage) {
                        results.push(exactPackage);
                    }
                }
            } else if (
                query.Version.toLowerCase().includes(
                    "bounded range".toLowerCase()
                )
            ) {
                const range =
                    query.Version.match(/\(([^)]+)\)/)?.[1]?.split("-");
                if (range && range.length === 2) {
                    const boundedPackages = await getBoundedRangePackages(
                        query.Name,
                        range,
                        dynamoDb
                    );
                    results.push(...boundedPackages);
                }
            } else if (
                query.Version.toLowerCase().includes("carat".toLowerCase())
            ) {
                const version = query.Version.match(
                    /\(([^)]+)\)/
                )?.[1]?.replace(/^\^+/, "");
                if (version) {
                    const caratPackages = await getCaratPackages(
                        query.Name,
                        version,
                        dynamoDb
                    );
                    results.push(...caratPackages);
                }
            } else if (
                query.Version.toLowerCase().includes("tilde".toLowerCase())
            ) {
                const version = query.Version.match(
                    /\(([^)]+)\)/
                )?.[1]?.replace(/^~+/, "");
                if (version) {
                    const tildePackages = await getTildePackages(
                        query.Name,
                        version,
                        dynamoDb
                    );
                    results.push(...tildePackages);
                }
            }
        } else {
            console.warn("Missing Version or Name in the query:", query);
        }
    }

    // Removing duplicate packages from the results
    results = results.filter(
        (item, index, self) =>
            index ===
            self.findIndex(
                (t) => t.ID === item.ID && t.Version === item.Version
            )
    );

    // Pagination logic
    const pageSize = 10;
    const paginatedResults = results.slice(offset, offset + pageSize);

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
            offset:
                offset + pageSize < results.length
                    ? (offset + pageSize).toString()
                    : "0",
        },
        body: JSON.stringify(paginatedResults),
    };
};

export async function handlePackageByRegEx(
    body: any,
    dynamoDb: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        if (!body) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid.",
                }),
            };
        }

        let parsedBody;
        try {
            parsedBody = typeof body === "string" ? JSON.parse(body) : body;
        } catch (error) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Invalid JSON in request body.",
                }),
            };
        }

        if (!parsedBody.RegEx || typeof parsedBody.RegEx !== "string") {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid.",
                }),
            };
        }

        // Compile the regular expression
        let regexPattern: RegExp;
        try {
            regexPattern = new RegExp(parsedBody.RegEx, "i");
        } catch (error) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "The provided RegEx pattern is invalid.",
                }),
            };
        }

        // Scan the DynamoDB table for all packages
        const params = {
            TableName: "ECE461_Database",
        };

        const command = new ScanCommand(params);
        const response = await dynamoDb.send(command);

        const items = response.Items || [];

        // Extract GitHub URLs from database entries
        const githubUrls = items
            .filter((item: any) => item.URL)
            .map((item: any) => item.URL);

        // Fetch README content for all GitHub URLs in a batch
        let readmeContent: Record<string, string> = {};
        if (githubUrls.length > 0) {
            readmeContent = await fetchReadmesBatch(githubUrls);
        }

        const results = items
            .filter((item: any) => {
                const packageNameWithVersion = item.ECEfoursixone;
                const githubUrl = item.URL;
                const readmeText = readmeContent[githubUrl] || "";
                const packageName = packageNameWithVersion.replace(/\d+$/, "");
                return (
                    regexPattern.test(packageName) ||
                    regexPattern.test(readmeText)
                );
            })
            .map((item: any) => {
                const packageNameWithVersion = item.ECEfoursixone;
                const packageName = packageNameWithVersion.replace(/\d+$/, "");
                return {
                    Version: item.Version,
                    Name: packageName,
                    ID: item.ECEfoursixone,
                };
            });

        // Handle no matches
        if (results.length === 0) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "No package found under this regex.",
                }),
            };
        }

        // Return successful response with matching packages
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error("Error handling /package/byRegEx:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

export async function handlePackageHistory(
    packageName: string,
    dynamoDb: DynamoDBDocumentClient
): Promise<APIGatewayProxyResult> {
    try {
        if (!packageName) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Package name is missing or invalid.",
                }),
            };
        }

        const params = {
            TableName: "ECE461_HistoryTable",
            KeyConditionExpression: "PackageName = :packageName",
            ExpressionAttributeValues: {
                ":packageName": packageName,
            },
        };

        const result = await dynamoDb.send(new QueryCommand(params));

        if (!result.Items || result.Items.length === 0) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "No history found for the specified package.",
                }),
            };
        }

        // Transform the result into the expected structure
        const historyEntries = result.Items.map((item: any) => ({
            User: {
                name: item.User.username,
                isAdmin: item.User.isAdmin,
            },
            Date: item.Timestamp,
            PackageMetadata: {
                Name: item.PackageMetadata.Name,
                Version: item.PackageMetadata.Version,
                ID: item.PackageMetadata.ID,
            },
            Action: item.Action,
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(historyEntries),
        };
    } catch (error) {
        console.error("Error querying package history:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Failed to retrieve package history.",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}

export async function handlePackageDelete(
    id: string,
    dynamoDb: DynamoDBDocumentClient,
    s3Client: S3Client,
    authToken: string
): Promise<APIGatewayProxyResult> {
    try {
        console.log(`Attempting to delete package with ID: ${id}`);

        // Validate user credentials
        const userData = await getUserInfo(authToken, dynamoDb);
        if (!userData) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Unauthorized or invalid token.",
                }),
            };
        }

        // Retrieve the package data
        const getCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { ECEfoursixone: id },
        });
        const packageData = await dynamoDb.send(getCommand);

        if (!packageData.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Package does not exist." }),
            };
        }

        const { Version, URL } = packageData.Item;

        // Construct the S3 file key
        const s3FileKey = `packages/${id.toLowerCase()}.zip`;

        // Delete the package from S3
        try {
            console.log(`Deleting file from S3: ${s3FileKey}`);
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: s3FileKey,
                })
            );
            console.log(`File deleted from S3: ${s3FileKey}`);
        } catch (s3Error) {
            console.error("Error deleting file from S3:", s3Error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to delete file from S3.",
                }),
            };
        }

        // Delete the package record from DynamoDB
        try {
            console.log(`Deleting package from DynamoDB: ${id}`);
            await dynamoDb.send(
                new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { ECEfoursixone: id },
                })
            );
            console.log(`Package deleted from DynamoDB: ${id}`);
        } catch (dbError) {
            console.error("Error deleting package from DynamoDB:", dbError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to delete package from DynamoDB.",
                }),
            };
        }

        try {
            console.log(`Updating history for deleted package: ${id}`);
            await updateHistory(
                dynamoDb,
                authToken,
                { Name: id.replace(/\d+$/, ""), Version, ID: id },
                "DELETE"
            );
            console.log("History updated successfully.");
        } catch (historyError) {
            console.error("Error updating history:", historyError);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Failed to update history for the deleted package.",
                }),
            };
        }

        // Return success response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Package deleted successfully." }),
        };
    } catch (error) {
        console.error("Error processing package deletion:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "An error occurred while processing the request.",
                details: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}
