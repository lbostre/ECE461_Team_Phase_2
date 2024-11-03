import axios from 'axios';

export async function fetchCommits(commitsUrl: string, headers: { Accept: string; Authorization: string; }) {
    let page = 1, totalCommits = 0;
    const uniqueContributors = new Map<string, number>();

    while (true) {
        const response = await axios.get(`${commitsUrl}?page=${page}&per_page=100`, { headers });
        if (response.data.length === 0) break;
        totalCommits += response.data.length;

        response.data.forEach((commit: { author: { login: any; }; }) => {
        const login = commit.author?.login;
        if (login) uniqueContributors.set(login, (uniqueContributors.get(login) || 0) + 1);
        });

        page++;
    }

    return Array.from(uniqueContributors);
}

export async function fetchIssues(issuesUrl: string, headers: { Accept: string; Authorization: string; }) {
    let page = 1, openIssues = 0, closedIssues = 0, issueDurations: number[] = [];

    while (true) {
        const response = await axios.get(`${issuesUrl}?page=${page}&per_page=100&state=all`, { headers });
        if (response.data.length === 0) break;

        response.data.forEach((issue: { closed_at: string | number | Date; created_at: string | number | Date; }) => {
        if (issue.closed_at) {
            const duration = (new Date(issue.closed_at).getTime() - new Date(issue.created_at).getTime()) / (1000 * 3600 * 24);
            issueDurations.push(duration);
            closedIssues++;
        } else {
            openIssues++;
        }
        });

        page++;
    }

    return { openIssues, closedIssues, issueDurations };
}
