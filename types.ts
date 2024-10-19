export interface PackageMetadata {
    Name: string;
    Version: string;
    ID: string;
}

export interface PackageData {
    Content?: string; // Code or content of the package
    URL?: string; // Link to the package file
    debloat?: boolean; // Optional flag for debloating
}

// This interface represents the body of the request for creating or updating a package
export interface PackageRequestBody {
    metadata: PackageMetadata; // The metadata of the package (e.g., Name, Version, ID)
    data: PackageData; // The data object containing either content or a URL
}

// A type alias for package ID
export type PackageID = string;

// This interface represents a complete package structure including metadata and content
export interface Package {
    metadata?: PackageMetadata;
    data?: PackageData;
    ID: PackageID; // Unique identifier for the package
    content?: string; // Content of the package, optional as it may not always be fetched
}
