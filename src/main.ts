import * as dotenv from 'dotenv';
import { convertToApiUrl, getGithubUrlFromNpm, cloneRepo, findReadme, findLicense, cleanUpRepository } from './util/repoUtils.js';
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
    const clockStart = Date.now();
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

            // Fetch data from API
            console.log('Fetching commits...');
            const uniqueContributors = await fetchCommits(commitsUrl, headers);
            console.log('Fetched commits. Unique contributors:', uniqueContributors.length);

            console.log('Fetching issues...');
            const { openIssues, closedIssues, issueDurations } = await fetchIssues(issuesUrl, headers);
            console.log(`Fetched issues. Open issues: ${openIssues}, Closed issues: ${closedIssues}, Issue durations: ${issueDurations.length}`);

            // Calculate each metric in parallel
            console.log('Calculating metrics...');
            const [
                { busFactorValue, busFactorEnd },
                { correctnessValue, correctnessEnd },
                { responsivenessValue, responsivenessEnd },
                { rampUpTimeValue, rampUpTimeEnd },
                { licenseCompatabilityValue, licenseEnd }
            ] = await Promise.all([
                busFactor(uniqueContributors),
                correctness(openIssues, closedIssues),
                responsiveness(issueDurations),
                rampUpTime(readme),
                licensing(license)
            ]);
            console.log('Metrics calculated successfully');

            // Calculate overall score
            console.log('Calculating overall score...');
            const netScore = await calculateScore(
                busFactorValue,
                responsivenessValue,
                correctnessValue,
                rampUpTimeValue,
                licenseCompatabilityValue
            );
            const scoreEnd = Date.now();
            console.log('Score calculated:', netScore);

            // Calculate and log latency for each metric
            const busFactorLatency = (busFactorEnd - clockStart) / 1000;
            const correctnessLatency = (correctnessEnd - clockStart) / 1000;
            const responsivenessLatency = (responsivenessEnd - clockStart) / 1000;
            const rampUpTimeLatency = (rampUpTimeEnd - clockStart) / 1000;
            const licenseCompatabilityLatency = (licenseEnd - clockStart) / 1000;

            const result: RepoDataResult = {
                BusFactor: busFactorValue,
                BusFactor_Latency: busFactorLatency,
                Correctness: correctnessValue,
                Correctness_Latency: correctnessLatency,
                RampUp: rampUpTimeValue,
                RampUp_Latency: rampUpTimeLatency,
                ResponsiveMaintainer: responsivenessValue,
                ResponsiveMaintainer_Latency: responsivenessLatency,
                License: licenseCompatabilityValue,
                License_Latency: licenseCompatabilityLatency,
                NetScore: netScore,
                NetScore_Latency: busFactorLatency + correctnessLatency + rampUpTimeLatency + responsivenessLatency + licenseCompatabilityLatency,
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
