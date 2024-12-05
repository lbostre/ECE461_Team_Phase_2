import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRepoData } from '../../src/main';
import * as repoUtils from '../../src/util/repoUtils';
import * as fetchData from '../../src/util/fetchData';
import * as busFactor from '../../src/metrics/busFactor';
import * as responsiveness from '../../src/metrics/responsiveness';
import * as correctness from '../../src/metrics/correctness';
import * as rampUpTime from '../../src/metrics/rampUpTime';
import * as licensing from '../../src/metrics/licensing';
import * as calculateScore from '../../src/metrics/calculateScore';

// Test getRepoData function


// Mock environment variables
process.env.GITHUB_TOKEN = 'test-github-token';

// Mock the necessary functions
vi.mock('../../src/util/repoUtils', () => ({
    convertToApiUrl: vi.fn(),
    getGithubUrlFromNpm: vi.fn(),
    cloneRepo: vi.fn(),
    findReadme: vi.fn(),
    findLicense: vi.fn(),
    cleanUpRepository: vi.fn(),
}));

vi.mock('../../src/util/fetchData', () => ({
    fetchCommits: vi.fn(),
    fetchIssues: vi.fn(),
}));

vi.mock('../../src/metrics/busFactor', () => ({
    busFactor: vi.fn(),
}));

vi.mock('../../src/metrics/responsiveness', () => ({
    responsiveness: vi.fn(),
}));

vi.mock('../../src/metrics/correctness', () => ({
    correctness: vi.fn(),
}));

vi.mock('../../src/metrics/rampUpTime', () => ({
    rampUpTime: vi.fn(),
}));

vi.mock('../../src/metrics/licensing', () => ({
    licensing: vi.fn(),
}));

vi.mock('../../src/metrics/calculateScore', () => ({
    calculateScore: vi.fn(),
}));

describe('getRepoData', () => {
    const repoURL = 'https://github.com/test/repo';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return null for an invalid GitHub URL', async () => {
        const result = await getRepoData('');
        expect(result).toBeNull();
    });

    it('should convert NPM URL to GitHub URL', async () => {
        vi.mocked(repoUtils.getGithubUrlFromNpm).mockResolvedValue('https://github.com/test/repo');
        vi.mocked(repoUtils.convertToApiUrl).mockReturnValue('https://api.github.com/repos/test/repo');
        vi.mocked(repoUtils.findReadme).mockResolvedValue('README content');
        vi.mocked(repoUtils.findLicense).mockResolvedValue('LICENSE content');
        vi.mocked(fetchData.fetchCommits).mockResolvedValue([['contributor1', 1], ['contributor2', 2]]);
        vi.mocked(fetchData.fetchIssues).mockResolvedValue({
        openIssues: 10,
        closedIssues: 20,
        issueDurations: [1, 2, 3],
        });
        vi.mocked(busFactor.busFactor).mockResolvedValue({ busFactorValue: 0.8, busFactorEnd: Date.now() });
        vi.mocked(correctness.correctness).mockResolvedValue({ correctnessValue: 0.9, correctnessEnd: Date.now() });
        vi.mocked(responsiveness.responsiveness).mockResolvedValue({ responsivenessValue: 0.7, responsivenessEnd: Date.now() });
        vi.mocked(rampUpTime.rampUpTime).mockResolvedValue({ rampUpTimeValue: 0.6, rampUpTimeEnd: Date.now() });
        vi.mocked(licensing.licensing).mockResolvedValue({ licenseCompatabilityValue: 1.0, licenseEnd: Date.now() });
        vi.mocked(calculateScore.calculateScore).mockResolvedValue(0.8);

        const result = await getRepoData('https://www.npmjs.com/package/test');
        expect(result).not.toBeNull();
        expect(repoUtils.getGithubUrlFromNpm).toHaveBeenCalledWith('https://www.npmjs.com/package/test');
        expect(repoUtils.convertToApiUrl).toHaveBeenCalledWith('https://github.com/test/repo');
    });

    it('should fetch repository data and calculate metrics', async () => {
        vi.mocked(repoUtils.convertToApiUrl).mockReturnValue('https://api.github.com/repos/test/repo');
        vi.mocked(repoUtils.cloneRepo).mockResolvedValue('/path/to/repo');
        vi.mocked(repoUtils.findReadme).mockResolvedValue('README content');
        vi.mocked(repoUtils.findLicense).mockResolvedValue('LICENSE content');
        vi.mocked(fetchData.fetchCommits).mockResolvedValue([['contributor1', 1], ['contributor2', 2]]);
        vi.mocked(fetchData.fetchIssues).mockResolvedValue({
        openIssues: 10,
        closedIssues: 20,
        issueDurations: [1, 2, 3],
        });
        vi.mocked(busFactor.busFactor).mockResolvedValue({ busFactorValue: 0.8, busFactorEnd: Date.now() });
        vi.mocked(correctness.correctness).mockResolvedValue({ correctnessValue: 0.9, correctnessEnd: Date.now() });
        vi.mocked(responsiveness.responsiveness).mockResolvedValue({ responsivenessValue: 0.7, responsivenessEnd: Date.now() });
        vi.mocked(rampUpTime.rampUpTime).mockResolvedValue({ rampUpTimeValue: 0.6, rampUpTimeEnd: Date.now() });
        vi.mocked(licensing.licensing).mockResolvedValue({ licenseCompatabilityValue: 1.0, licenseEnd: Date.now() });
        vi.mocked(calculateScore.calculateScore).mockResolvedValue(0.8);

        const result = await getRepoData(repoURL);

        expect(result).not.toBeNull();
        expect(repoUtils.cloneRepo).toHaveBeenCalledWith(repoURL);
        expect(repoUtils.findReadme).toHaveBeenCalledWith('/path/to/repo');
        expect(repoUtils.findLicense).toHaveBeenCalledWith('/path/to/repo', 'README content');
        expect(fetchData.fetchCommits).toHaveBeenCalledWith('https://api.github.com/repos/test/repo/commits', expect.any(Object));
        expect(fetchData.fetchIssues).toHaveBeenCalledWith('https://api.github.com/repos/test/repo/issues', expect.any(Object));
        expect(busFactor.busFactor).toHaveBeenCalledWith([['contributor1', 1], ['contributor2', 2]]);
        expect(correctness.correctness).toHaveBeenCalledWith(10, 20);
        expect(responsiveness.responsiveness).toHaveBeenCalledWith([1, 2, 3]);
        expect(rampUpTime.rampUpTime).toHaveBeenCalledWith('README content');
        expect(licensing.licensing).toHaveBeenCalledWith('LICENSE content');
        expect(calculateScore.calculateScore).toHaveBeenCalledWith(0.8, 0.7, 0.9, 0.6, 1.0);
    });

    it('should handle errors and return null', async () => {
        vi.mocked(repoUtils.convertToApiUrl).mockReturnValue('https://api.github.com/repos/test/repo');
        vi.mocked(repoUtils.cloneRepo).mockRejectedValue(new Error('Clone error'));

        const result = await getRepoData(repoURL);

        expect(result).toBeNull();
        expect(repoUtils.cloneRepo).toHaveBeenCalledWith(repoURL);
    });
});
