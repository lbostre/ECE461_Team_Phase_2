import { minify } from "terser";
import { BUCKET_NAME, s3 } from "../../index.js";
import { Package, PackageData } from "../../types.js";
import fs from "fs";
import axios from "axios";
import AdmZip from 'adm-zip';
import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'ECE461_Database';

// create result
export const createPackageService = async (
    name: string,
    data: PackageData,
    version: string
) => {
    const newPackage = {
        metadata: { Name: name.replace(/\d+$/, ''), Version: version, ID: `${name.toLowerCase()}${version.replace(/\./g, "")}` },
        data: { ...data },
    };
    return newPackage;
};

// Function to upload content to S3
export const uploadToS3 = async (
    content: string,
    fileName: string
): Promise<string> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: `packages/${fileName}`, // file path in S3
        Body: content,
        ContentType: "application/octet-stream", // Adjust content type based on your needs
    };

    console.log(`Uploading file to S3: ${fileName}`);
    const data = await s3.upload(params).promise();
    console.log(`File uploaded successfully. S3 URL: ${data.Location}`);
    return data.Location;
};

// Function to download a file from S3 and save it to local storage
export const downloadAndSaveFromS3 = async (
    fileName: string,
    localPath: string
): Promise<void> => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: `packages/${fileName}`, // Adjust the key if your file is in a different path
    };

    try {
        console.log(`Downloading file from S3: ${fileName}`);
        const data = await s3.getObject(params).promise();

        // Save the downloaded file to local storage
        fs.writeFileSync(localPath, data.Body as Buffer);
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

export async function uploadGithubRepoAsZipToS3(
    githubRepoUrl: string,
    fileName: string
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
            Bucket: BUCKET_NAME,
            Key: `packages/${fileName}`, // file path in S3
            Body: zipBase64,
            ContentType: "application/octet-stream", // Adjust content type based on your needs
        };

        console.log(`Uploading file to S3: ${fileName}`);
        const data = await s3.upload(params).promise();
        console.log(`File uploaded successfully. S3 URL: ${data.Location}`);

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

function getRepositoryUrlFromPackageJson(packageJson: any): string | null {
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

export async function fetchPackageById(id: string): Promise<Package | null> {
    console.log(`Fetching package metadata from DynamoDB for ID: ${id}`);

    // Step 1: Fetch Version and URL from DynamoDB
    try {
        const dynamoResult = await dynamoDb.get({
            TableName: TABLE_NAME,
            Key: { ECEfoursixone: id },
        }).promise();

        if (!dynamoResult.Item) {
            console.error(`No metadata found in DynamoDB for ID: ${id}`);
            return null;
        }

        const { Version, URL, JSProgram } = dynamoResult.Item;
        console.log(`Retrieved Version: ${Version}, URL: ${URL} from DynamoDB for ID: ${id}`);

        const name = id.replace(/\d+$/, "");

        // Step 2: Fetch package content from S3
        const params = {
            Bucket: BUCKET_NAME,
            Key: `packages/${id}.zip`,
        };
        const s3Data = await s3.getObject(params).promise();
        const content = s3Data.Body?.toString("base64") || "";

        // Step 3: Construct the package response
        const packageData: Package = {
            metadata: {
                Name: name, // Extracts Name if ID includes Version
                Version: Version,
                ID: id,
            },
            data: {
                Content: content,
                URL: URL,
                JSProgram: JSProgram,
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

import axios from 'axios';

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

export async function fetchCostWithGraphQL(
    repoUrl: string,
    includeDependencies: boolean
): Promise<{
    standaloneCost: number;
    totalCost: number;
    dependencies: Record<string, { standaloneCost: number; totalCost: number }>;
}> {
    console.log("Starting fetchCostWithGraphQL...");

    // Extract owner and repo from repoUrl
    const repoNameMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoNameMatch) {
        console.error("Invalid GitHub repository URL:", repoUrl);
        throw new Error("Invalid GitHub repository URL.");
    }
    const [, owner, repo] = repoNameMatch;

    console.log("Extracted owner:", owner, "repo:", repo);

    // Define the GraphQL query
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
    console.log("Constructed GraphQL query and variables:", { query, variables });

    const headers = {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
    };

    try {
        // Send the request to GitHub GraphQL API
        console.log("Sending request to GitHub GraphQL API...");
        const response = await axios.post(
            GITHUB_GRAPHQL_URL,
            { query, variables },
            { headers }
        );

        console.log("GraphQL API Response received:", JSON.stringify(response.data, null, 2));

        // Parse the response data
        const repoData = response.data.data?.repository;
        if (!repoData) {
            console.error("Failed to fetch repository data:", response.data);
            throw new Error("Repository data is missing in GraphQL response.");
        }

        // Calculate standalone cost
        const standaloneCost = repoData.diskUsage / 1024; // Convert KB to MB
        console.log("Standalone cost calculated:", standaloneCost);

        let totalCost = standaloneCost;
        const dependencies: Record<string, { standaloneCost: number; totalCost: number }> = {};

        // Process dependencies if requested
        if (includeDependencies) {
            const dependencyNodes = repoData.dependencyGraphManifests?.nodes?.flatMap(
                (manifest: any) => manifest.dependencies.nodes
            ) || [];

            console.log("Fetched dependencies from GraphQL response:", dependencyNodes.length);

            for (const dep of dependencyNodes) {
                const packageName = dep.packageName;
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
                    console.log(
                        `Processed dependency: ${dependencyId}, standaloneCost: ${depStandaloneCost}, totalCost (so far): ${totalCost}`
                    );
                } else {
                    console.warn(`Repository data missing for dependency: ${dependencyId}`);
                }
            }
        }

        console.log("Final totalCost:", totalCost);
        console.log("Dependencies processed:", dependencies);

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

