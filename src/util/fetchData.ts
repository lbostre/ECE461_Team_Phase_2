import axios, { AxiosResponse } from 'axios';
import { CommitHistoryResponse, IssuesResponse, RepoInfo } from '../../types';

export function extractRepoInfo(apiUrl: string): RepoInfo {
    try {
        const parsedUrl = new URL(apiUrl);

        if (parsedUrl.protocol !== 'https:') {
            parsedUrl.protocol = 'https:';
        }

        if (!parsedUrl.hostname.endsWith('api.github.com')) {
            parsedUrl.hostname = 'api.github.com';
        }

        const match = parsedUrl.pathname.match(/\/repos\/([^/]+)\/([^/]+)/);
        if (!match) {
            throw new Error(`Cannot extract owner and repo from URL: ${apiUrl}`);
        }

        return { owner: match[1], repo: match[2] };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to extract GitHub repository information: ${errorMessage}`);
    }
}

export async function fetchCommits(
    commitsUrl: string,
    headers: { Accept: string; Authorization: string }
) {
    const repoInfo = extractRepoInfo(commitsUrl);
    const uniqueContributors = new Map<string, number>();
    const query = `
        query ($owner: String!, $name: String!, $cursor: String) {
            repository(owner: $owner, name: $name) {
                defaultBranchRef {
                    target {
                        ... on Commit {
                            history(first: 100, after: $cursor) {
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                edges {
                                    node {
                                        author {
                                            user {
                                                login
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
        // Use AxiosResponse to correctly type the response
        const response: AxiosResponse<CommitHistoryResponse> = await axios.post(
            'https://api.github.com/graphql',
            {
                query,
                variables: {
                    owner: repoInfo.owner,
                    name: repoInfo.repo,
                    cursor,
                },
            },
            { headers }
        );

        const history = response.data.data.repository.defaultBranchRef.target.history;
        hasNextPage = history.pageInfo.hasNextPage;
        cursor = history.pageInfo.endCursor;

        history.edges.forEach((edge) => {
            const login = edge.node.author.user?.login;
            if (login) {
                uniqueContributors.set(login, (uniqueContributors.get(login) || 0) + 1);
            }
        });
    }

    return Array.from(uniqueContributors);
}

export async function fetchIssues(
    issuesUrl: string,
    headers: { Accept: string; Authorization: string }
) {
    const repoInfo = extractRepoInfo(issuesUrl);
    const query = `
        query ($owner: String!, $name: String!, $cursor: String) {
            repository(owner: $owner, name: $name) {
                issues(first: 100, after: $cursor, states: [OPEN, CLOSED]) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            state
                            createdAt
                            closedAt
                        }
                    }
                }
            }
        }
    `;

    let cursor: string | null = null;
    let hasNextPage = true;
    let openIssues = 0;
    let closedIssues = 0;
    const issueDurations: number[] = [];

    while (hasNextPage) {
        // Use AxiosResponse to correctly type the response
        const response: AxiosResponse<IssuesResponse> = await axios.post(
            'https://api.github.com/graphql',
            {
                query,
                variables: {
                    owner: repoInfo.owner,
                    name: repoInfo.repo,
                    cursor,
                },
            },
            { headers }
        );

        const issues = response.data.data.repository.issues;
        hasNextPage = issues.pageInfo.hasNextPage;
        cursor = issues.pageInfo.endCursor;

        issues.edges.forEach((edge) => {
            if (edge.node.state === 'CLOSED') {
                closedIssues++;
                const duration =
                    (new Date(edge.node.closedAt!).getTime() - new Date(edge.node.createdAt).getTime()) /
                    (1000 * 3600 * 24);
                issueDurations.push(duration);
            } else {
                openIssues++;
            }
        });
    }

    return { openIssues, closedIssues, issueDurations };
}

