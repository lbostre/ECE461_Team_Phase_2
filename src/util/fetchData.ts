import axios from 'axios';

export function correctGitHubUrl(apiUrl: string, endpoint: string): string {
    try {
        // Ensure the URL is a valid URL
        const parsedUrl = new URL(apiUrl);

        // Fix the protocol if needed
        if (parsedUrl.protocol !== 'https:') {
            parsedUrl.protocol = 'https:';
        }

        // Ensure the hostname is GitHub's API
        if (!parsedUrl.hostname.endsWith('api.github.com')) {
            parsedUrl.hostname = 'api.github.com';
        }

        // Extract the owner and repo from the path
        const match = parsedUrl.pathname.match(/\/repos\/([^/]+)\/([^/]+)/);
        if (!match) {
            throw new Error(`Cannot extract owner and repo from URL: ${apiUrl}`);
        }

        const owner = match[1];
        const repo = match[2];

        // Construct the correct URL
        return `https://api.github.com/repos/${owner}/${repo}/${endpoint}`;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to correct GitHub URL: ${apiUrl}. Details: ${errorMessage}`);
    }
}

export async function fetchCommits(
    commitsUrl: string,
    headers: { Accept: string; Authorization: string }
) {
    const correctedUrl = correctGitHubUrl(commitsUrl, 'commits');
    const pageSize = 100;
    const maxParallelRequests = 5;
    const uniqueContributors = new Map<string, number>();

    let page = 1;
    let keepFetching = true;

    // Calculate the date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const since = sixMonthsAgo.toISOString(); // Convert to ISO 8601 format

    while (keepFetching) {
        const responses = await Promise.all(
            Array.from({ length: maxParallelRequests }, (_, i) =>
                axios.get(
                    `${correctedUrl}?page=${page + i}&per_page=${pageSize}&since=${since}`,
                    { headers }
                )
            )
        );

        keepFetching = false;
        for (const response of responses) {
            if (response.data.length > 0) {
                keepFetching = true;
                response.data.forEach((commit: { author: { login: string } }) => {
                    const login = commit.author?.login;
                    if (login) {
                        uniqueContributors.set(login, (uniqueContributors.get(login) || 0) + 1);
                    }
                });
            }
        }

        page += maxParallelRequests;
    }

    return Array.from(uniqueContributors);
}

export async function fetchIssues(
    issuesUrl: string,
    headers: { Accept: string; Authorization: string }
) {
    const correctedUrl = correctGitHubUrl(issuesUrl, 'issues');
    const pageSize = 100;
    const maxParallelRequests = 5;

    let page = 1;
    let openIssues = 0;
    let closedIssues = 0;
    const issueDurations: number[] = [];

    let keepFetching = true;

    // Calculate the date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const since = sixMonthsAgo.toISOString(); // Convert to ISO 8601 format

    while (keepFetching) {
        const responses = await Promise.all(
            Array.from({ length: maxParallelRequests }, (_, i) =>
                axios.get(
                    `${correctedUrl}?page=${page + i}&per_page=${pageSize}&state=all&since=${since}`,
                    { headers }
                )
            )
        );

        keepFetching = false;
        for (const response of responses) {
            if (response.data.length > 0) {
                keepFetching = true;
                response.data.forEach(
                    (issue: { closed_at: string | number | Date; created_at: string | number | Date }) => {
                        if (issue.closed_at) {
                            const duration =
                                (new Date(issue.closed_at).getTime() -
                                    new Date(issue.created_at).getTime()) /
                                (1000 * 3600 * 24);
                            issueDurations.push(duration);
                            closedIssues++;
                        } else {
                            openIssues++;
                        }
                    }
                );
            }
        }

        page += maxParallelRequests;
    }

    return { openIssues, closedIssues, issueDurations };
}
