export interface PackageMetadata {
    Name: string;
    Version: string;
    ID: string;
}

export interface PackageData {
    Content?: string; // Code or content of the package
    URL?: string; // Link to the package file
    JSProgram?: string;
    debloat?: boolean; // Optional flag for debloating
}

export interface NewPackageRequestBody {
    body: string;
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
}

export interface RepoDataResult {
    BusFactor: number;             // Bus factor score
    BusFactor_Latency: number;     // Latency time for bus factor calculation
    Correctness: number;           // Correctness score
    Correctness_Latency: number;   // Latency time for correctness calculation
    RampUp: number;                // Ramp-up time score
    RampUp_Latency: number;        // Latency time for ramp-up score calculation
    ResponsiveMaintainer: number;  // Responsiveness score
    ResponsiveMaintainer_Latency: number; // Latency time for responsiveness calculation
    License: number;               // License compatibility score
    License_Latency: number;       // Latency time for license compatibility calculation
    NetScore: number;              // Overall score
    NetScore_Latency: number;      // Latency time for score calculation
}

export interface AuthenticationRequest {
    User: {
        name: string;
        isAdmin: boolean;
    };
    Secret: {
        password: string;
    };
}