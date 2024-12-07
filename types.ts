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
    BusFactorLatency: number;     // Latency time for bus factor calculation
    Correctness: number;           // Correctness score
    CorrectnessLatency: number;   // Latency time for correctness calculation
    RampUp: number;                // Ramp-up time score
    RampUpLatency: number;        // Latency time for ramp-up score calculation
    ResponsiveMaintainer: number;  // Responsiveness score
    ResponsiveMaintainerLatency: number; // Latency time for responsiveness calculation
    LicenseScore: number;               // License compatibility score
    LicenseScoreLatency: number;       // Latency time for license compatibility calculation
    GoodPinningPractice: number;
    GoodPinningPracticeLatency: number;
    PullRequest: number;
    PullRequestLatency: number;
    NetScore: number;              // Overall score
    NetScoreLatency: number;      // Latency time for score calculation
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

export interface PackageQuery {
    Name: string;
    Version: string;
}

export interface IssueNode {
    createdAt: string;
    closedAt: string | null;
    state: "OPEN" | "CLOSED";
}

export interface IssueEdge {
    node: IssueNode;
}

export interface PageInfo {
    hasNextPage: boolean;
    endCursor: string | null;
}

export interface IssuesResponse {
    repository: {
        issues: {
            edges: IssueEdge[];
            pageInfo: PageInfo;
        };
    };
}

export interface CommitAuthor {
    user: {
        login: string;
    } | null;
}

export interface CommitNode {
    author: CommitAuthor | null;
}

export interface CommitEdge {
    node: CommitNode;
}

export interface CommitHistory {
    edges: CommitEdge[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
}

export interface RepositoryRef {
    target: {
        history: CommitHistory;
    } | null;
}

export interface Repository {
    ref: RepositoryRef | null;
}

export interface CommitsResponseData {
    repository: Repository | null;
}