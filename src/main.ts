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
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
        };

        // Fetch URLs for commits and issues
        const commitsUrl = `${GITHUB_API_URL}/commits`;
        const issuesUrl = `${GITHUB_API_URL}/issues`;

        // Clone repo and locate README and License
        console.log('Cloning repository...');
        const repoPath = await cloneRepo(repoURL);
        console.log('Repository cloned at path:', repoPath);
        try {
            console.log('Searching for README...');
            const readme = await findReadme(repoPath);
            console.log('Found README:', readme);

            console.log('Searching for LICENSE...');
            const license = await findLicense(repoPath, readme);
            console.log('Found LICENSE:', license);

            console.log('Fetching data...');

            const [uniqueContributors, issuesData] = await Promise.all([
                fetchCommits(commitsUrl, headers),
                fetchIssues(issuesUrl, headers),
            ]);

            console.log('Fetched commits. Unique contributors:', uniqueContributors.length);

            const { openIssues, closedIssues, issueDurations } = issuesData;
            console.log(
                `Fetched issues. Open issues: ${openIssues}, Closed issues: ${closedIssues}, Issue durations: ${issueDurations.length}`
            );

            console.log('Calculating metrics...');
            const [
                { busFactorValue, busFactorLatency },
                { correctnessValue, correctnessLatency },
                { responsivenessValue, responsivenessLatency },
                { rampUpTimeValue, rampUpTimeLatency },
                { licenseCompatabilityValue, licenseLatency },
                { value: dependencyPinningValue, latency: dependencyPinningLatency },
                { value: codeReviewValue, latency: codeReviewLatency }
            ] = await Promise.all([
                busFactor(uniqueContributors),
                correctness(openIssues, closedIssues),
                responsiveness(issueDurations),
                rampUpTime(readme),
                licensing(license),
                dependencyPinning(repoPath),
                codeReviewCoverage(GITHUB_API_URL, headers)
            ]);
            console.log('Metrics calculated successfully');

            // Calculate overall score
            console.log('Calculating overall score...');
            const clockStart = Date.now();
            const netScore = await calculateScore(
                busFactorValue,
                responsivenessValue,
                correctnessValue,
                rampUpTimeValue,
                licenseCompatabilityValue,
                dependencyPinningValue,
                codeReviewValue
            );
            const scoreEnd = Date.now();
            console.log('Score calculated:', netScore);

            const result: RepoDataResult = {
                BusFactor: busFactorValue,
                BusFactorLatency: busFactorLatency,
                Correctness: correctnessValue,
                CorrectnessLatency: correctnessLatency,
                RampUp: rampUpTimeValue,
                RampUpLatency: rampUpTimeLatency,
                ResponsiveMaintainer: responsivenessValue,
                ResponsiveMaintainerLatency: responsivenessLatency,
                LicenseScore: licenseCompatabilityValue,
                LicenseScoreLatency: licenseLatency,
                GoodPinningPractice: dependencyPinningValue,
                GoodPinningPracticeLatency: dependencyPinningLatency,
                PullRequest: codeReviewValue,
                PullRequestLatency: codeReviewLatency,
                NetScore: netScore,
                NetScoreLatency: busFactorLatency + correctnessLatency + rampUpTimeLatency + responsivenessLatency + dependencyPinningLatency + licenseLatency,
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
