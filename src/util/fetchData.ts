import axios from 'axios';
import { CommitEdge, CommitsResponseData, IssueEdge, IssuesResponse } from '../../types';

export async function fetchCommits(apiUrl: string, headers: { Accept: string; Authorization: string } ) {
    const { owner: repoOwner, repo: repoName } = extractOwnerAndRepo(apiUrl);

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

    const variables = {
        repoOwner,
        repoName,
        pageSize: 100,
        cursor: null as string | null,
    };

    const graphqlEndpoint = "https://api.github.com/graphql";

    try {
        const uniqueContributors = new Map<string, number>();
        let hasNextPage = true;

        while (hasNextPage) {
            const response = await axios.post<{ data: CommitsResponseData }>(
                graphqlEndpoint,
                { query, variables },
                { headers }
            );

            const repository = response.data?.data?.repository;
            if (!repository || !repository.ref || !repository.ref.target) {
                throw new Error(`Repository history not found for ${repoOwner}/${repoName}`);
            }

            const history = repository.ref.target.history;
            history.edges.forEach(({ node }: CommitEdge) => {
                const login = node?.author?.user?.login;
                if (login) {
                    uniqueContributors.set(login, (uniqueContributors.get(login) || 0) + 1);
                }
            });

            hasNextPage = history.pageInfo.hasNextPage;
            variables.cursor = history.pageInfo.endCursor;
        }

        return Array.from(uniqueContributors);
    } catch (error) {
        console.error(`Error fetching commits for ${apiUrl}:`, error);
        throw error;
    }
}

export async function fetchIssues(
    apiUrl: string,
    headers: { Accept: string; Authorization: string }
): Promise<{ openIssues: number; closedIssues: number; issueDurations: number[] }> {
    const { owner: repoOwner, repo: repoName } = extractOwnerAndRepo(apiUrl);

    const query = `
        query ($repoOwner: String!, $repoName: String!, $pageSize: Int!, $cursor: String) {
            repository(owner: $repoOwner, name: $repoName) {
                issues(first: $pageSize, after: $cursor, states: [OPEN, CLOSED]) {
                    edges {
                        node {
                            createdAt
                            closedAt
                            state
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

    const variables = {
        repoOwner,
        repoName,
        pageSize: 100,
        cursor: null as string | null,
    };

    const graphqlEndpoint = "https://api.github.com/graphql";

    try {
        let openIssues = 0;
        let closedIssues = 0;
        const issueDurations: number[] = [];
        let hasNextPage = true;

        while (hasNextPage) {
            const response = await axios.post<{ data: IssuesResponse }>(
                graphqlEndpoint,
                { query, variables },
                { headers }
            );

            const repository = response.data?.data?.repository;
            if (!repository) {
                throw new Error(`Repository not found: ${repoOwner}/${repoName}`);
            }

            const issues = repository.issues;
            if (!issues) {
                throw new Error(`No issues found for ${repoOwner}/${repoName}`);
            }

            issues.edges.forEach(({ node }: IssueEdge) => {
                if (node.state === "CLOSED" && node.closedAt && node.createdAt) {
                    const duration =
                        (new Date(node.closedAt).getTime() -
                            new Date(node.createdAt).getTime()) /
                        (1000 * 3600 * 24);
                    issueDurations.push(duration);
                    closedIssues++;
                } else if (node.state === "OPEN") {
                    openIssues++;
                }
            });

            hasNextPage = issues.pageInfo.hasNextPage;
            variables.cursor = issues.pageInfo.endCursor;
        }

        return { openIssues, closedIssues, issueDurations };
    } catch (error) {
        console.error(`Error fetching issues for ${apiUrl}`, error);
        throw error;
    }
}

function extractOwnerAndRepo(apiUrl: string) {
    const match = apiUrl.match(/repos\/([^/]+)\/([^/]+)/);
    if (!match || match.length < 3) {
        throw new Error(`Invalid GitHub API URL: ${apiUrl}`);
    }
    return { owner: match[1], repo: match[2] };
}
