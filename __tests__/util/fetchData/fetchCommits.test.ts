import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { fetchCommits } from '../../../src/util/fetchData';

vi.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchCommits', () => {
    const commitsUrl = 'https://api.github.com/repos/user/repo';
    const headers = {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'Bearer token',
    };

    it('should return unique contributors from paginated commits', async () => {
        // Mock paginated responses
        mockedAxios.get
            .mockResolvedValueOnce({
                data: [
                    { author: { login: 'user1' } },
                    { author: { login: 'user2' } },
                ],
            })
            .mockResolvedValueOnce({
                data: [
                    { author: { login: 'user1' } },
                    { author: { login: 'user3' } },
                ],
            })
            .mockResolvedValue({ data: [] }); // No more data

        const result = await fetchCommits(commitsUrl, headers);

        expect(result).toEqual([
            ['user1', 2],
            ['user2', 1],
            ['user3', 1],
        ]);
        expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should handle empty commit data gracefully', async () => {
        mockedAxios.get.mockResolvedValue({ data: [] });

        const result = await fetchCommits(commitsUrl, headers);

        expect(result).toEqual([]);
        expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
        mockedAxios.get.mockRejectedValue(new Error('API error'));

        await expect(fetchCommits(commitsUrl, headers)).rejects.toThrow('API error');
        expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should correct the URL and fetch commits', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({
                data: [
                    { author: { login: 'user1' } },
                    { author: { login: 'user2' } },
                ],
            })
            .mockResolvedValue({ data: [] }); // No more data

        const correctedUrl = 'https://api.github.com/repos/user/repo/commits';
        const result = await fetchCommits(correctedUrl, headers);

        expect(result).toEqual([
            ['user1', 1],
            ['user2', 1],
        ]);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            `${correctedUrl}?page=1&per_page=100`,
            { headers }
        );
    });
});
