import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { minify } from "terser";
import { BUCKET_NAME, s3 } from "../../index.js";
import { PackageData, PackageMetadata } from "../../types.js";
import fs from "fs";
import axios from "axios";

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

export function uuidv4(): string {
    // Generate a random UUID v4
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

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
    bucketName: string,
    s3Key: string
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
        const uploadParams: AWS.S3.PutObjectRequest = {
            Bucket: bucketName,
            Key: s3Key, // The file name in S3
            Body: zipBase64,
            ContentEncoding: "base64", // Specifies that the content is base64 encoded
            ContentType: "application/zip", // Set correct MIME type
        };

        console.log(`Starting upload to S3 with params:`, uploadParams);
        const data: AWS.S3.ManagedUpload.SendData = await s3
            .upload(uploadParams)
            .promise();
        console.log(`File uploaded successfully to S3 at ${data.Location}`);

        return data.Location; // Return the uploaded file URL
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

// // Example usage for S3 download and save
// (async () => {
//     const fileName = "example.zip"; // Replace with your file name
//     const localPath = `./downloads/${fileName}`; // Local path where you want to save the file

//     try {
//         await downloadAndSaveFromS3(fileName, localPath);
//     } catch (error) {
//         console.error(`Failed to download file: ${error.message}`);
//     }
// })();
