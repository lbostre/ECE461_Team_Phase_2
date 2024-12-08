import * as dotenv from 'dotenv';
import { convertToApiUrl, getGithubUrlFromNpm, cloneRepo, findReadme, findLicense, cleanUpRepository, dependencyPinning, codeReviewCoverage } from './util/repoUtils.js';
import { fetchCommits, fetchIssues } from './util/fetchData.js';
import { busFactor } from './metrics/busFactor.js';
import { responsiveness } from './metrics/responsiveness.js';
import { correctness } from './metrics/correctness.js';
import { rampUpTime } from './metrics/rampUpTime.js';
import { licensing } from './metrics/licensing.js';
import { calculateScore } from './metrics/calculateScore.js';
import { RepoDataResult } from '../types.js';

dotenv.config();

export async function getRepoData(repoURL: string): Promise<RepoDataResult | null> {
    console.log('Starting getRepoData with URL:', repoURL);

    // Validate and process GitHub URL
    if (!repoURL) {
        console.error('Invalid GitHub URL:', repoURL);
        return null;
    }

    const start = Date.now();

    if (repoURL.includes('npmjs.com')) {
        console.log('Processing NPM URL:', repoURL);
        const npmGithubUrl = await getGithubUrlFromNpm(repoURL);
        if (npmGithubUrl) {
            repoURL = npmGithubUrl;
            console.log('Converted NPM URL to GitHub URL:', repoURL);
        } else {
            console.error('Failed to retrieve GitHub URL from NPM package');
            return null;
        }
    }
    const GITHUB_API_URL = convertToApiUrl(repoURL);
    console.log('Converted to API URL:', GITHUB_API_URL);

    try {
        // Define headers for API calls
        const headers = {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
        };

        // Clone repo and locate README and License
        console.log('Cloning repository...');
        const cloneStart = Date.now();
        const repoPath = await cloneRepo(repoURL);
        const cloneLatency = (Date.now() - cloneStart) / 1000;
        console.log('Repository cloned at path:', repoPath);

        try {
            console.log('Locating README and LICENSE...');
            const fileSearchStart = Date.now();
            const [readme, license] = await Promise.all([
                findReadme(repoPath),
                findLicense(repoPath),
            ]);
            const fileSearchLatency = (Date.now() - fileSearchStart) / 1000;

            if (!readme || !license) {
                console.warn('README or LICENSE file missing. Skipping further calculations.');
                return null;
            }

            console.log('Fetching commit and issue data...');
            const fetchStart = Date.now();
            const [uniqueContributors, issuesData] = await Promise.all([
                fetchCommits(`${GITHUB_API_URL}/commits`, headers),
                fetchIssues(`${GITHUB_API_URL}/issues`, headers),
            ]);
            const fetchLatency = (Date.now() - fetchStart) / 1000;

            const { openIssues, closedIssues, issueDurations } = issuesData;

            console.log('Calculating metrics...');
            const metricsStart = Date.now();
            const [
                { busFactorValue, busFactorLatency },
                { correctnessValue, correctnessLatency },
                { responsivenessValue, responsivenessLatency },
                { rampUpTimeValue, rampUpTimeLatency },
                { licenseCompatabilityValue },
                { value: dependencyPinningValue, latency: dependencyPinningLatency },
                { value: codeReviewValue, latency: codeReviewLatency },
            ] = await Promise.all([
                busFactor(uniqueContributors),
                correctness(openIssues, closedIssues),
                responsiveness(issueDurations),
                rampUpTime(readme),
                licensing(license),
                dependencyPinning(repoPath),
                codeReviewCoverage(GITHUB_API_URL, headers),
            ]);
            const metricsLatency = (Date.now() - metricsStart) / 1000;

            console.log('Metrics calculated successfully');

            // Calculate overall score
            console.log('Calculating overall score...');
            const scoreStart = Date.now();
            const netScore = await calculateScore(
                busFactorValue,
                responsivenessValue,
                correctnessValue,
                rampUpTimeValue,
                licenseCompatabilityValue,
                dependencyPinningValue,
                codeReviewValue
            );
            const scoreLatency = (Date.now() - scoreStart) / 1000;
            console.log('Score calculated:', netScore);

            const result: RepoDataResult = {
                BusFactor: busFactorValue,
                BusFactorLatency: busFactorLatency + cloneLatency,
                Correctness: correctnessValue,
                CorrectnessLatency: correctnessLatency + fetchLatency,
                RampUp: rampUpTimeValue,
                RampUpLatency: rampUpTimeLatency + fileSearchLatency,
                ResponsiveMaintainer: responsivenessValue,
                ResponsiveMaintainerLatency: responsivenessLatency + fetchLatency,
                LicenseScore: licenseCompatabilityValue,
                LicenseScoreLatency: fileSearchLatency,
                GoodPinningPractice: dependencyPinningValue,
                GoodPinningPracticeLatency: dependencyPinningLatency,
                PullRequest: codeReviewValue,
                PullRequestLatency: codeReviewLatency,
                NetScore: netScore,
                NetScoreLatency: metricsLatency + scoreLatency,
            };
            console.log('Final Result:', result);
            return result;
        } finally {
            await cleanUpRepository(repoPath);
        }
    } catch (error) {
        console.error('Error fetching repository data for', repoURL, error);
        return null;
    }
}