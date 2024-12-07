import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { fetchIssues } from '../../../src/util/fetchData';

vi.mock('axios');

describe('fetchIssues', () => {
    const issuesUrl = 'https://api.github.com/repos/user/repo';
    const headers = {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'Bearer token',
    };

    it('should return the count of open and closed issues and their durations', async () => {
        // Mock paginated responses
        vi.mocked(axios.get)
            .mockResolvedValueOnce({
                data: [
                    {
                        created_at: '2024-01-01T00:00:00Z',
                        closed_at: '2024-01-05T00:00:00Z',
                    },
                    { created_at: '2024-01-02T00:00:00Z', closed_at: null }, // Open issue
                ],
            })
            .mockResolvedValueOnce({
                data: [
                    {
                        created_at: '2024-01-03T00:00:00Z',
                        closed_at: '2024-01-04T00:00:00Z',
                    },
                ],
            })
            .mockResolvedValue({ data: [] }); // No more data

        const result = await fetchIssues(issuesUrl, headers);

        expect(result).toEqual({
            openIssues: 1,
            closedIssues: 2,
            issueDurations: [4, 1], // Durations in days
        });
        expect(axios.get).toHaveBeenCalled();
    });

    it('should handle empty issue data gracefully', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: [] });

        const result = await fetchIssues(issuesUrl, headers);

        expect(result).toEqual({
            openIssues: 0,
            closedIssues: 0,
            issueDurations: [],
        });
        expect(axios.get).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('API error'));

        await expect(fetchIssues(issuesUrl, headers)).rejects.toThrow('API error');
        expect(axios.get).toHaveBeenCalled();
    });

    it('should calculate durations correctly for issues closed on the same day', async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({
            data: [
                {
                    created_at: '2024-01-01T00:00:00Z',
                    closed_at: '2024-01-02T00:00:00Z', // One day duration
                },
            ],
        });
        vi.mocked(axios.get).mockResolvedValue({ data: [] }); // No more data

        const result = await fetchIssues(issuesUrl, headers);

        expect(result).toEqual({
            openIssues: 0,
            closedIssues: 1,
            issueDurations: [1], // Duration in days (same day)
        });
        expect(axios.get).toHaveBeenCalled();
    });

    it('should correct the URL and fetch issues', async () => {
        vi.mocked(axios.get)
            .mockResolvedValueOnce({
                data: [
                    {
                        created_at: '2024-01-01T00:00:00Z',
                        closed_at: '2024-01-03T00:00:00Z',
                    },
                ],
            })
            .mockResolvedValue({ data: [] }); // No more data

        const correctedUrl = 'https://api.github.com/repos/user/repo/issues';
        const result = await fetchIssues(correctedUrl, headers);

        expect(result).toEqual({
            openIssues: 0,
            closedIssues: 1,
            issueDurations: [2], // Duration in days
        });
        expect(axios.get).toHaveBeenCalledWith(
            `${correctedUrl}?page=1&per_page=100&state=all`,
            { headers }
        );
    });
});
