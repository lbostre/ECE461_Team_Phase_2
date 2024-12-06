import axios from 'axios';

export async function fetchCommits(
    commitsUrl: string,
    headers: { Accept: string; Authorization: string }
): Promise<Array<{ login: string; commitCount: number }>> {
    const graphqlEndpoint = "https://api.github.com/graphql";

    // Extract owner and repository from the commitsUrl
    const { owner, repo } = extractOwnerAndRepo(commitsUrl);

    const pageSize = 100;
    let cursor: string | null = null;
    let hasNextPage = true;
    const contributorsMap = new Map<string, number>();

    while (hasNextPage) {
        const query = `
            query ($repoOwner: String!, $repoName: String!, $pageSize: Int!, $cursor: String) {
                repository(owner: $repoOwner, name: $repoName) {
                    ref(qualifiedName: "refs/heads/main") {
                        target {
                            ... on Commit {
                                history(first: $pageSize, after: $cursor) {
                                    edges {
                                        node {
                                            author {
                                                user {
                                                    login
                                                }
                                            }
                                        }
                                    }
                                    pageInfo {
                                        hasNextPage
                                        endCursor
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const variables: {
            repoOwner: string;
            repoName: string;
            pageSize: number;
            cursor: string | null;
        } = { repoOwner: owner, repoName: repo, pageSize, cursor };


        const response = await axios.post(
            graphqlEndpoint,
            { query, variables },
            {
                headers: {
                    Authorization: headers.Authorization,
                    "Content-Type": "application/json",
                },
            }
        );

        const history = response.data.data.repository.ref.target.history;
        history.edges.forEach((edge: any) => {
            const login = edge.node.author?.user?.login;
            if (login) {
                contributorsMap.set(login, (contributorsMap.get(login) || 0) + 1);
            }
        });

        hasNextPage = history.pageInfo.hasNextPage;
        cursor = history.pageInfo.endCursor;
    }

    return Array.from(contributorsMap.entries()).map(([login, commitCount]) => ({
        login,
        commitCount,
    }));
}

export async function fetchIssues(
    issuesUrl: string,
    headers: { Accept: string; Authorization: string }
): Promise<{ openIssues: number; closedIssues: number; issueDurations: number[] }> {
    const graphqlEndpoint = "https://api.github.com/graphql";

    // Extract owner and repository from the issuesUrl
    const { owner, repo } = extractOwnerAndRepo(issuesUrl);

    const pageSize = 100;
    let cursor: string | null = null;
    let hasNextPage = true;

    let openIssues = 0;
    let closedIssues = 0;
    const issueDurations: number[] = [];

    while (hasNextPage) {
        const query = `
            query ($repoOwner: String!, $repoName: String!, $pageSize: Int!, $cursor: String) {
                repository(owner: $repoOwner, name: $repoName) {
                    issues(first: $pageSize, after: $cursor) {
                        edges {
                            node {
                                state
                                createdAt
                                closedAt
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        `;

        const variables: {
            repoOwner: string;
            repoName: string;
            pageSize: number;
            cursor: string | null;
        } = { repoOwner: owner, repoName: repo, pageSize, cursor };


        const response = await axios.post(
            graphqlEndpoint,
            { query, variables },
            {
                headers: {
                    Authorization: headers.Authorization,
                    "Content-Type": "application/json",
                },
            }
        );

        const issues = response.data.data.repository.issues;
        issues.edges.forEach((edge: any) => {
            const issue = edge.node;
            if (issue.state === "CLOSED") {
                closedIssues++;
                const duration =
                    (new Date(issue.closedAt).getTime() - new Date(issue.createdAt).getTime()) /
                    (1000 * 3600 * 24);
                issueDurations.push(duration);
            } else {
                openIssues++;
            }
        });

        hasNextPage = issues.pageInfo.hasNextPage;
        cursor = issues.pageInfo.endCursor;
    }

    return { openIssues, closedIssues, issueDurations };
}

function extractOwnerAndRepo(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        throw new Error(`Invalid GitHub URL: ${url}`);
    }
    return { owner: match[1], repo: match[2] };
}