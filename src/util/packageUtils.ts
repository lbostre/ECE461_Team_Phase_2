import { minify } from "terser";
import { Package, PackageData } from "../../types.js";
import fs from "fs";
import axios from "axios";
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import semver from "semver";
import { getUserInfo } from "./authUtil.js";
const TABLE_NAME = 'ECE461_Database';

// create result
export const createPackageService = async (
    name: string,
    data: PackageData,
    version: string
) => {
    const newPackage = {
        metadata: {
            Name: name.replace(/\d+$/, ""),
            Version: version,
            ID: `${name.toLowerCase()}${version.replace(/\./g, "")}`,
        },
        data: { ...data },
    };
    return newPackage;
};

// Function to upload content to S3
export const uploadToS3 = async (
    content: string,
    fileName: string,
    s3Client: S3Client,
    bucketName: string
): Promise<string> => {
    const params = {
        Bucket: bucketName,
        Key: `packages/${fileName}`, // file path in S3
        Body: content,
        ContentType: "application/octet-stream", // Adjust content type based on your needs
    };

    console.log(`Uploading file to S3: ${fileName}`);
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    console.log(`File uploaded successfully.`);
    return `https://${bucketName}.s3.amazonaws.com/packages/${fileName}`;
};

// Function to download a file from S3 and save it to local storage
export const downloadAndSaveFromS3 = async (
    fileName: string,
    localPath: string,
    s3Client: S3Client,
    bucketName: string
): Promise<void> => {
    const params = {
        Bucket: bucketName,
        Key: `packages/${fileName}`, // Adjust the key if your file is in a different path
    };

    try {
        console.log(`Downloading file from S3: ${fileName}`);
        const command = new GetObjectCommand(params);
        const data = await s3Client.send(command);

        // Save the downloaded file to local storage
        if (!data.Body) {
            throw new Error("S3 object body is undefined");
        }
        const body = await streamToBuffer(data.Body);
        fs.writeFileSync(localPath, body);
        console.log(`File saved locally as ${localPath}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error downloading or saving file: ${error.message}`);
        } else {
            console.error(`Error downloading or saving file: ${String(error)}`);
        }
        throw error; // Rethrow the error for further handling
    }
};

// Helper function to convert stream to buffer
export const streamToBuffer = async (stream: ReadableStream | Blob | Readable | null): Promise<Buffer> => {
    if (!stream) {
        throw new Error("Stream is null or undefined");
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

export async function uploadGithubRepoAsZipToS3(
    githubRepoUrl: string,
    fileName: string,
    s3Client: S3Client,
    bucketName: string
): Promise<string> {
    try {
        console.log(`Starting uploadGithubRepoAsZipToS3 function.`);
        console.log(`Input GitHub repo URL: ${githubRepoUrl}`);

        // Parse the repo details from the URL
        const [owner, repo] = githubRepoUrl.split("/").slice(-2);
        console.log(`Parsed GitHub owner: ${owner}, repo: ${repo}`);

        // Construct the GitHub archive URL for the zip file
        const githubZipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;
        console.log(`Constructed GitHub zip URL: ${githubZipUrl}`);

        // Download the zip file from GitHub
        console.log(`Starting download from GitHub...`);
        const response = await axios({
            url: githubZipUrl,
            method: "GET",
            responseType: "arraybuffer", // Important for handling binary data
        });
        console.log(
            `Download complete. Received ${response.data.byteLength} bytes.`
        );

        // Convert the downloaded zip file to a base64 string
        const zipBase64 = Buffer.from(response.data).toString("base64");
        console.log(`Converted zip file to base64 format.`);

        // Upload the base64 string to S3
        const params = {
            Bucket: bucketName,
            Key: `packages/${fileName}`, // file path in S3
            Body: zipBase64,
            ContentType: "application/octet-stream", // Adjust content type based on your needs
        };

        console.log(`Uploading file to S3: ${fileName}`);
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        console.log(`File uploaded successfully.`);

        return zipBase64; // Return the uploaded file URL
    } catch (error) {
        console.error(
            "Error during uploadGithubRepoAsZipToS3 execution:",
            error
        );
        throw error;
    }
}

// Perform the debloat using Terser
export async function performDebloat(content: string): Promise<string> {
    try {
        console.log("Starting debloat process...");
        const result = await minify(content);
        console.log("Debloat completed.");
        return result.code || content;
    } catch (error) {
        console.error("Error during debloat:", error);
        return content; // Return the original content in case of an error
    }
}

export async function getRepositoryVersion(url: string): Promise<string> {
    // Extract owner and repo from URL using regex
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

    if (!match) {
        throw new Error("Invalid GitHub URL.");
    }

    const [, owner, repo] = match;

    // Call GitHub API to get the tags
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/tags`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Log the full response for debugging
        console.log("GitHub API tags response:", data);

        // Check if tags are available and find the latest tag
        if (Array.isArray(data) && data.length > 0) {
            // Assuming the first tag in the array is the latest
            const latestTag = data[0].name;

            // Remove "v" prefix if it exists
            const version = latestTag.startsWith("v")
                ? latestTag.slice(1)
                : latestTag;
            console.log("Latest version:", version);
            return version;
        } else {
            console.log("No tags found, defaulting to 1.0.0");
            return "1.0.0";
        }
    } catch (error) {
        console.error("Error fetching version:", error);
        return "1.0.0"; // Return default version if an error occurs
    }
}

export async function extractPackageJsonUrl(contentBase64: string): Promise<string | null> {
    // Step 1: Decode the base64 content
    const buffer = Buffer.from(contentBase64, 'base64');

    // Step 2: Load the content into a zip extractor
    const zip = new AdmZip(buffer);

    // Step 3: Search for package.json file
    const packageJsonEntry = zip.getEntry('package.json');
    if (!packageJsonEntry) {
        console.error("package.json not found in content");
        return null;
    }

    // Step 4: Parse package.json to get the repository URL
    const packageJsonContent = packageJsonEntry.getData().toString('utf8');
    const packageJson = JSON.parse(packageJsonContent);

    return getRepositoryUrlFromPackageJson(packageJson);
}

export function getRepositoryUrlFromPackageJson(packageJson: any): string | null {
    const repository = packageJson?.repository;

    if (!repository) return null;

    let url = '';

    // Case 1: repository as a string
    if (typeof repository === 'string') {
        // Assume GitHub shorthand like "eslint/eslintrc"
        url = `https://github.com/${repository}`;
    }

    // Case 2: repository as an object with "url" field
    else if (typeof repository === 'object' && repository.url) {
        // Check if URL is in standard format or includes "git+"
        url = repository.url.startsWith('git+') ? repository.url.slice(4) : repository.url;
        url = repository.url.startsWith('git') ? repository.url.slice(4) : repository.url;
    }

    // Step 5: Strip trailing ".git" if present and ensure format
    if (url.endsWith('.git')) {
        url = url.slice(0, -4);
    }

    // Validate URL structure and ensure it's in GitHub format
    const match = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
        return `https://github.com/${match[1]}/${match[2]}`;
    }

    return null;
}

export async function extractVersionFromPackageJson(contentBase64: string): Promise<string> {
    // Step 1: Decode the base64 content
    const buffer = Buffer.from(contentBase64, 'base64');

    // Step 2: Load the content into a zip extractor
    const zip = new AdmZip(buffer);

    // Step 3: Search for package.json file
    const packageJsonEntry = zip.getEntry('package.json');
    if (!packageJsonEntry) {
        console.error("package.json not found in content");
        return "1.0.0";
    }

    // Step 4: Parse package.json to get the package version
    const packageJsonContent = packageJsonEntry.getData().toString('utf8');
    const packageJson = JSON.parse(packageJsonContent);

    return packageJson.version || "1.0.0";
}

export async function fetchPackageById(
    id: string,
    dynamoDb: DynamoDBDocumentClient,
    s3Client: S3Client,
    bucketName: string,
    authToken: string // Pass authToken to get user info
): Promise<Package | null> {
    console.log(`Fetching package metadata from DynamoDB for ID: ${id}`);

    try {
        // Fetch user info
        const userInfo = await getUserInfo(authToken, dynamoDb);
        if (!userInfo || typeof userInfo === "object" && "statusCode" in userInfo) {
            console.error("Failed to fetch user information:", userInfo);
            throw new Error("User information could not be retrieved.");
        }

        const username = userInfo.username;

        // Fetch metadata from DynamoDB
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { ECEfoursixone: id },
        });
        const dynamoResult = await dynamoDb.send(command);

        if (!dynamoResult.Item) {
            console.error(`No metadata found in DynamoDB for ID: ${id}`);
            return null;
        }

        const { Version, URL, JSProgram, DownloadInfo } = dynamoResult.Item;
        console.log(`Retrieved metadata from DynamoDB:`, {
            Version,
            URL,
            JSProgram,
            DownloadInfo,
        });

        // Update the `DownloadInfo` attribute in DynamoDB
        const downloadEvent = {
            user: username,
            timestamp: new Date().toISOString(),
        };
        const updatedDownloadInfo = Array.isArray(DownloadInfo)
            ? [...DownloadInfo, downloadEvent]
            : [downloadEvent];

        await dynamoDb.send(
            new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { ECEfoursixone: id },
                UpdateExpression: "SET DownloadInfo = :downloadInfo",
                ExpressionAttributeValues: {
                    ":downloadInfo": updatedDownloadInfo,
                },
            })
        );

        console.log(`Updated DownloadInfo for package ID ${id}:`, updatedDownloadInfo);

        // Fetch package content from S3
        const params = {
            Bucket: bucketName,
            Key: `packages/${id}.zip`,
        };

        console.log(`Fetching content from S3 for ID: ${id}`);
        const s3Command = new GetObjectCommand(params);
        const s3Data = await s3Client.send(s3Command);

        if (!s3Data.Body) {
            throw new Error("S3 object body is undefined");
        }

        // Convert S3 Body to a base64 string
        const content = await streamToBuffer(s3Data.Body).then((buffer) =>
            buffer.toString("base64")
        );

        // Construct the package response
        const packageData: Package = {
            metadata: {
                Name: id.replace(/\d+$/, ""), // Extract Name if ID includes Version
                Version: Version || "1.0.0",
                ID: id,
            },
            data: {
                URL: URL || "",
                JSProgram: JSProgram || "",
                Content: content, // Add the base64 content fetched from S3
            },
        };

        console.log("Fetched package data:", packageData);
        return packageData;
    } catch (error) {
        console.error(`Error fetching package with ID ${id}:`, error);
        return null;
    }
}

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export async function fetchCostWithGraphQL(
    repoUrl: string,
    includeDependencies: boolean
): Promise<{
    standaloneCost: number;
    totalCost: number;
    dependencies: Record<string, { standaloneCost: number; totalCost: number }>;
}> {
    const repoNameMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoNameMatch) {
        throw new Error("Invalid GitHub repository URL.");
    }

    const [, owner, repo] = repoNameMatch;

    // Step 1: Fetch `package.json` to get the `dependencies` field
    const packageJsonUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`;
    const packageJsonResponse = await axios.get(packageJsonUrl);
    const packageJson = packageJsonResponse.data;
    const allowedDependencies = new Set(Object.keys(packageJson.dependencies || {}));

    // Step 2: GraphQL query to fetch repository size and dependencies
    const query = `
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        diskUsage
        dependencyGraphManifests(first: 100) {
          nodes {
            dependencies(first: 100) {
              nodes {
                packageName
                requirements
                repository {
                  nameWithOwner
                  diskUsage
                }
              }
            }
          }
        }
      }
    }`;

    const variables = { owner, repo };

    const headers = {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.post(
            GITHUB_GRAPHQL_URL,
            { query, variables },
            { headers }
        );

        const repoData = response.data.data?.repository;
        if (!repoData) {
            throw new Error("Repository data is missing in GraphQL response.");
        }

        const standaloneCost = repoData.diskUsage / 1024; // Convert KB to MB
        let totalCost = standaloneCost;
        const dependencies: Record<string, { standaloneCost: number; totalCost: number }> = {};

        if (includeDependencies) {
            const dependencyNodes = repoData.dependencyGraphManifests?.nodes?.flatMap(
                (manifest: any) => manifest.dependencies.nodes
            ) || [];

            for (const dep of dependencyNodes) {
                const packageName = dep.packageName;
                // if (!allowedDependencies.has(packageName)) {
                //     continue;
                // }

                const version = dep.requirements.replace(/[^\d]/g, ''); // Strip non-digit characters
                const dependencyId = `${packageName}${version}`;
                if (dep.repository && dep.repository.diskUsage) {
                    const depRepo = dep.repository;
                    const depStandaloneCost = depRepo.diskUsage / 1024; // Convert KB to MB
                    dependencies[dependencyId] = {
                        standaloneCost: depStandaloneCost,
                        totalCost: depStandaloneCost, // Initial total cost is standalone
                    };
                    totalCost += depStandaloneCost;
                }
            }
        }

        return {
            standaloneCost,
            totalCost,
            dependencies,
        };
    } catch (error) {
        console.error("Error during fetchCostWithGraphQL execution:", error);
        throw error;
    }
}

export const extractNameFromId = (id: string): string => {
    return id.replace(/[0-9]/g, '');
};

// Function to get a package by an exact version
export const getExactPackage = async (
    name: string,
    version: string,
    dynamoDb: DynamoDBDocumentClient
) => {
    try {
        // Construct the key from name and version
        const packageId = `${name}${version.replace(/\./g, "")}`;

        const params = {
            TableName: "ECE461_Database",
            KeyConditionExpression: "ECEfoursixone = :id",
            ExpressionAttributeValues: {
                ":id": packageId,
            },
        };

        const command = new QueryCommand(params);
        const response = await dynamoDb.send(command);

        if (response.Items && response.Items.length > 0) {
            const item = response.Items[0];
            return {
                Version: item.Version,
                Name: extractNameFromId(item.ECEfoursixone),
                ID: item.ECEfoursixone
            };
        }
        return null;
    } catch (error) {
        console.error("Error querying exact package:", error);
        throw new Error("Could not query exact package.");
    }
};

// Function to get packages within a bounded range
export const getBoundedRangePackages = async (
    name: string,
    range: string[],
    dynamoDb: DynamoDBDocumentClient
) => {
    const [startVersion, endVersion] = range;

    try {
        const params = {
            TableName: "ECE461_Database",
            FilterExpression: "contains(ECEfoursixone, :name) AND #version BETWEEN :start AND :end",
            ExpressionAttributeNames: {
                "#version": "Version"
            },
            ExpressionAttributeValues: {
                ":name": name,
                ":start": startVersion,
                ":end": endVersion
            }
        };

        const command = new ScanCommand(params);
        const response = await dynamoDb.send(command);

        const items = response.Items ? response.Items : [];
        return items.map(item => ({
            Version: item.Version,
            Name: extractNameFromId(item.ECEfoursixone),
            ID: item.ECEfoursixone
        }));
    } catch (error) {
        console.error("Error querying bounded range packages:", error);
        throw new Error("Could not query bounded range packages.");
    }
};

// Function to get packages using Carat (^version)
export const getCaratPackages = async (
    name: string,
    version: string,
    dynamoDb: DynamoDBDocumentClient
) => {
    // Make sure `version` is not null
    if (!version) {
        throw new Error("Version must be provided");
    }

    try {
        // Create the valid semver range for carat version
        const versionFilter = semver.validRange(`^${version}`);
        if (!versionFilter) {
            throw new Error("Invalid version format for carat range.");
        }

        // Scan for items that match the given name pattern
        const params = {
            TableName: "ECE461_Database",
            FilterExpression: "contains(ECEfoursixone, :name)",
            ExpressionAttributeValues: {
                ":name": name,
            }
        };

        const command = new ScanCommand(params);
        const response = await dynamoDb.send(command);
        const items = response.Items ? response.Items : [];

        // Filter results based on the semver comparison
        const filteredItems = items.filter(item => {
            return semver.satisfies(item.Version, versionFilter);
        });

        return filteredItems.map(item => ({
            Version: item.Version,
            Name: extractNameFromId(item.ECEfoursixone),
            ID: item.ECEfoursixone
        }));
    } catch (error) {
        if (error instanceof Error && error.message === "Invalid version format for carat range.") {
            throw error;
        }
        console.error("Error querying carat packages:", error);
        throw new Error("Could not query carat packages.");
    }
};

// Function to get packages using Tilde (~version)
export const getTildePackages = async (
    name: string,
    version: string,
    dynamoDb: DynamoDBDocumentClient
) => {
    // Make sure `version` is not null
    if (!version) {
        throw new Error("Version must be provided");
    }

    try {
        // Create the valid semver range for tilde version
        const versionFilter = semver.validRange(`~${version}`);
        if (!versionFilter) {
            throw new Error("Invalid version format for tilde range");
        }

        // Scan for items that match the given name pattern
        const params = {
            TableName: "ECE461_Database",
            FilterExpression: "contains(ECEfoursixone, :name)",
            ExpressionAttributeValues: {
                ":name": name,
            }
        };

        const command = new ScanCommand(params);
        const response = await dynamoDb.send(command);
        const items = response.Items ? response.Items : [];

        // Filter results based on the semver comparison
        const filteredItems = items.filter(item => {
            return semver.satisfies(item.Version, versionFilter);
        });

        return filteredItems.map(item => ({
            Version: item.Version,
            Name: extractNameFromId(item.ECEfoursixone),
            ID: item.ECEfoursixone
        }));
    } catch (error) {
        if (error instanceof Error && error.message === "Invalid version format for tilde range") {
            throw error;
        }
        console.error("Error querying tilde packages:", error);
        throw new Error("Could not query tilde packages.");
    }
};

export const getAllPackages = async (dynamoDb: DynamoDBDocumentClient) => {
    let params: {
        TableName: string;
        ExclusiveStartKey?: Record<string, any>;
    } = {
        TableName: "ECE461_Database",
    };

    let allPackages = [];
    let data;

    try {
        do {
            // Create a new ScanCommand each iteration for pagination
            const command = new ScanCommand(params);
            data = await dynamoDb.send(command);

            // Check if data.Items is present and add it to the results
            if (data.Items) {
                allPackages.push(...data.Items.map(item => {
                    return {
                        Version: item.Version,
                        Name: extractNameFromId(item.ECEfoursixone), 
                        ID: item.ECEfoursixone,
                    };
                }));
            }

            // Update ExclusiveStartKey to paginate if there are more records to read
            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } while (data.LastEvaluatedKey);
    } catch (error) {
        console.error("Error scanning DynamoDB:", error);
        throw new Error("Could not retrieve all packages.");
    }

    return allPackages;
};

export async function fetchReadmesBatch(
    githubUrls: string[]
): Promise<Record<string, string>> {
    const graphqlEndpoint = "https://api.github.com/graphql";

    // Extract owner and repo details for all URLs
    const queries = githubUrls.map((url, index) => {
        const [owner, repo] = extractOwnerRepoFromUrl(url);
        return `
            repo${index}: repository(owner: "${owner}", name: "${repo}") {
                object(expression: "HEAD:README.md") {
                    ... on Blob {
                        text
                    }
                }
            }
        `;
    });

    // Break queries into manageable chunks
    const chunkSize = 10; // GitHub API limits request size, keep batches small
    const results: Record<string, string> = {};
    const batchedQueries = splitIntoChunks(queries, chunkSize);

    for (const batch of batchedQueries) {
        const batchedQuery = `{ ${batch.join("\n")} }`;

        const response = await axios.post(
            graphqlEndpoint,
            { query: batchedQuery },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.data.errors) {
            console.error("Error fetching README files:", response.data.errors);
            throw new Error("Failed to fetch README files.");
        }

        // Map results back to their corresponding GitHub URLs
        const data = response.data.data;
        Object.keys(data).forEach((key) => {
            const index = parseInt(key.replace("repo", ""), 10);
            results[githubUrls[index]] = data[key]?.object?.text || "";
        });
    }

    return results;
}

export function extractOwnerRepoFromUrl(url: string): [string, string] {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return [match[1], match[2]];
}

export function splitIntoChunks<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}