import axios from 'axios';

export async function fetchCommits(commitsUrl: string, headers: { Accept: string; Authorization: string }) {
    const pageSize = 100;
    const maxParallelRequests = 5;
    let page = 1;
    const uniqueContributors = new Map<string, number>();
    let keepFetching = true;

    while (keepFetching) {
        const requests = [];
        for (let i = 0; i < maxParallelRequests; i++) {
            requests.push(axios.get(`${commitsUrl}?page=${page + i}&per_page=${pageSize}`, { headers }));
        }

        const responses = await Promise.all(requests);
        responses.forEach((response) => {
            if (response.data.length === 0) {
                keepFetching = false;
                return;
            }
            response.data.forEach((commit: { author: { login: any } }) => {
                const login = commit.author?.login;
                if (login) {
                    uniqueContributors.set(login, (uniqueContributors.get(login) || 0) + 1);
                }
            });
        });

        page += maxParallelRequests;
    }

    return Array.from(uniqueContributors);
}

export async function fetchIssues(issuesUrl: string, headers: { Accept: string; Authorization: string }) {
    const pageSize = 100;
    const maxParallelRequests = 5;
    let page = 1;
    let openIssues = 0, closedIssues = 0;
    const issueDurations: number[] = [];
    let keepFetching = true;

    while (keepFetching) {
        const requests = [];
        for (let i = 0; i < maxParallelRequests; i++) {
            requests.push(axios.get(`${issuesUrl}?page=${page + i}&per_page=${pageSize}&state=all`, { headers }));
        }

        const responses = await Promise.all(requests);
        responses.forEach((response) => {
            if (response.data.length === 0) {
                keepFetching = false;
                return;
            }
            response.data.forEach((issue: { closed_at: string | number | Date; created_at: string | number | Date }) => {
                if (issue.closed_at) {
                    const duration = (new Date(issue.closed_at).getTime() - new Date(issue.created_at).getTime()) / (1000 * 3600 * 24);
                    issueDurations.push(duration);
                    closedIssues++;
                } else {
                    openIssues++;
                }
            });
        });

        page += maxParallelRequests;
    }

    return { openIssues, closedIssues, issueDurations };
}
