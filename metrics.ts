import axios from 'axios';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';


// Load environment variables from .env file
dotenv.config();


// GLOBAL CONSTANTS

const ACCUMULATION = 0.975;
const WEIGHT_BUS_FACTOR = 0.22;
const WEIGHT_RESPONSIVENESS = 0.2;
const WEIGHT_CORRECTNESS = 0.2;
const WEIGHT_RAMP_UP_TIME = 0.2;
const WEIGHT_LICENSING = 0.2;
const GIT = simpleGit();


// MAIN FUNCTIONS

function convertToApiUrl(githubUrl: string) {
    return githubUrl.replace('github.com', 'api.github.com/repos');
}

async function getGithubUrlFromNpm(npmUrl: string): Promise<string | null> {
  const packageName = npmUrl.split('/').pop();
  if (!packageName) {
      console.error('Invalid npm package URL.');
      return null;
  }

  try {
      const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
      const repositoryUrl = response.data.repository?.url;

      if (repositoryUrl && repositoryUrl.includes('github.com')) {
          return repositoryUrl.replace(/^git\+/, '').replace(/\.git$/, '');
      } else {
          console.error('GitHub repository URL not found in npm package data.');
          return null;
      }
  } catch (error) {
      console.error('Error fetching npm package data:', error);
      return null;
  }
}

async function cloneRepo(githubUrl: string) {
    const repoName = githubUrl.split('/').slice(-1)[0];
    const repoPath = path.join(__dirname, 'cloned_repo', repoName);
    await GIT.clone(githubUrl, repoPath, ['--depth', '1']);

    // console.log('Cloned repo to:', repoPath);
    return repoPath;
}
  
export async function getRepoData(githubUrl: string) {
  const clockStart = Date.now();
  if (!githubUrl) {
    console.error(githubUrl, ' is not a valid link');
    return;
  }

  if (githubUrl.includes('npmjs.com')) {
      const npmGithubUrl = await getGithubUrlFromNpm(githubUrl);
      if (npmGithubUrl) {
          githubUrl = npmGithubUrl;
      } else {
          return;
      }
  }
  
  const GITHUB_API_URL = convertToApiUrl(githubUrl);
  
  try {

    // fetch urls
    const commitsUrl = `${GITHUB_API_URL}/commits`;
    const issuesUrl = `${GITHUB_API_URL}/issues`;
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
    };

    // clone repo
    const repoPath = await cloneRepo(githubUrl);
    const readme = await findReadme(repoPath);
    const license = await findLicense(repoPath, readme);

    // Fetch API data
    const uniqueContributors = await fetchCommits(commitsUrl, headers);
    const {openIssues, closedIssues, issueDurations} = await fetchIssues(issuesUrl, headers);

    // calculate metrics in parallel
    const [
      {busFactorValue, busFactorEnd},
      {correctnessValue, correctnessEnd},
      {responsivenessValue, responsivenessEnd},
      {rampUpTimeValue, rampUpTimeEnd},
      {licenseCompatabilityValue, licenseEnd}
  ] = await Promise.all([
      busFactor(uniqueContributors),
      correctness(openIssues, closedIssues),
      responsiveness(issueDurations),
      rampUpTime(readme),
      licensing(license)
  ]);

    // calculate metrics
    const score = await calculateScore(busFactorValue, responsivenessValue, correctnessValue, rampUpTimeValue, licenseCompatabilityValue);
    const scoreEnd = Date.now();

    // calculate time taken for each metric
    const busFactorLatency = (busFactorEnd - clockStart) / 1000;
    const correctnessLatency = (correctnessEnd - clockStart) / 1000;
    const responsivenessLatency = (responsivenessEnd - clockStart) / 1000;
    const rampUpTimeLatency = (rampUpTimeEnd - clockStart) / 1000;
    const licenseCompatabilityLatency = (licenseEnd - clockStart) / 1000;
    const scoreLatency = (scoreEnd - clockStart) / 1000;

    // log data for testing
    // console.log('Number of Commits:', totalCommits);
    // console.log('Unique Contributors:', uniqueContributors);
    // console.log('Open Issues:', openIssues);
    // console.log('Closed Issues:', closedIssues);
    // console.log('Issue Durations:', issueDurations);
    // console.log('Readme:', readme);
    // console.log('License:', license);

    // console.log('Bus Factor:', busFactorValue);
    // console.log('Bus Factor Latency:', busFactorLatency);
    // console.log('Responsiveness:', responsivenessValue);
    // console.log('Responsiveness Latency:', responsivenessLatency);
    // console.log('Correctness:', correctnessValue);
    // console.log('Correctness Latency:', correctnessLatency);
    // console.log('Ramp-Up Time:', rampUpTimeValue);
    // console.log('Ramp-Up Time Latency:', rampUpTimeLatency);
    // console.log('License Compatability:', licenseCompatabilityValue);
    // console.log('License Compatability Latency:', licenseCompatabilityLatency);
    // console.log('Score:', score);
    // console.log('Score Latency:', scoreLatency);

    return {
      busFactorValue,
      busFactorLatency,
      responsivenessValue,
      responsivenessLatency,
      correctnessValue,
      correctnessLatency,
      rampUpTimeValue,
      rampUpTimeLatency,
      licenseCompatabilityValue,
      licenseCompatabilityLatency,
      score,
      scoreLatency
    };

  } 
  catch (error) {
    //console.log('Error fetching repo data for ', githubUrl);
    return {
      busFactorValue: -1,
      busFactorLatency: -1,
      responsivenessValue: -1,
      responsivenessLatency: -1,
      correctnessValue: -1,
      correctnessLatency: -1,
      rampUpTimeValue: -1,
      rampUpTimeLatency: -1,
      licenseCompatabilityValue: -1,
      licenseCompatabilityLatency: -1,
      score: -1,
      scoreLatency: -1
    };
  }
}


// API FETCH FUNCTIONS

async function fetchCommits(commitsUrl: string, headers: { Accept: string; Authorization: string; }) {
  let page = 1;
  let totalCommits = 0;
  let uniqueContributors = new Map<string, number>();
  let hasMoreCommits = true;

  // Fetch all commits by going through each page
  while (hasMoreCommits) {
    const response = await axios.get(`${commitsUrl}?page=${page}&per_page=100`, { headers });
    const commits = response.data;
    totalCommits += commits.length;

    // Add unique contributor names and number of times they appear
    commits.forEach((commit: { author: { login: any; }; }) => {
      if (commit.author && commit.author.login) {
          const login = commit.author.login;
          if (uniqueContributors.has(login)) {
              uniqueContributors.set(login, uniqueContributors.get(login)! + 1);
          } else {
              uniqueContributors.set(login, 1);
          }
      }
  });

    hasMoreCommits = commits.length === 100;
    page++;
}

return Array.from(uniqueContributors);
}

async function fetchIssues(issuesUrl: string, headers: { Accept: string; Authorization: string; }) {
  let page = 1;
  let hasMoreIssues = true;
  let openIssues = 0;
  let closedIssues = 0;
  let issueDurations: number[] = [];

  while (hasMoreIssues) {
    const response = await axios.get(`${issuesUrl}?page=${page}&per_page=100&state=all`, { headers });
    const issues = response.data;

    issues.forEach((issue: { closed_at: string | number | Date; created_at: string | number | Date; }) => {
      if (issue.closed_at) {
        let createdAt = new Date(issue.created_at);
        let closedAt = new Date(issue.closed_at);
        let duration = (closedAt.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
        issueDurations.push(duration);
        closedIssues++;
      }
      else{
        openIssues++;
      }
    });

    hasMoreIssues = issues.length === 100;
    page++;
  }

  return {
    openIssues,
    closedIssues,
    issueDurations
  };
}

// REPO SEARCH FUNCTIONS

async function fileExists(filePath: fs.PathLike){
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findReadme(repoPath: string){
  const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().startsWith('readme')) {
      return path.join(repoPath, entry.name);
    }
  }
  return null;
}

async function findLicense(repoPath: string, readme: string | null){
  // check for a license file
  const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().startsWith('license')) {
      const licensePath = path.join(repoPath, entry.name);
      const licenseContent = await fs.promises.readFile(licensePath, 'utf8');
      const license = identifyLicense(licenseContent);
      if (license !== null) {
        return license;
      }
    }
  }
  // check for a license in the readme
  if (!readme) {
    throw new Error('Readme file not found');
  }
  const readmeContent = await fs.promises.readFile(readme, 'utf8');
  const readmeLicense = identifyLicense(readmeContent);
  if (readmeLicense !== null) {
    return readmeLicense;
  }

  return null;
}

function identifyLicense(content: string){
  const licensePatterns: { [key: string]: RegExp } = {
    'MIT': /mit license/i,
    'Apache 2.0': /apache license, version 2\.0/i,
    'GPL v2.0': /gnu general public license, version 2/i,
    'GPL v3.0': /gnu general public license, version 3/i,
    'LGPL v2.1': /gnu lesser general public license, version 2\.1/i,
    'LGPL v3.0': /gnu lesser general public license, version 3/i,
    'BSD 2-Clause': /bsd 2-clause "simplified" license/i,
    'BSD 3-Clause': /bsd 3-clause "new" or "revised" license/i,
    'MPL 2.0': /mozilla public license, version 2\.0/i,
    'CDDL 1.0': /common development and distribution license, version 1\.0/i,
    'EPL 2.0': /eclipse public license, version 2\.0/i
  };

  for (const [license, pattern] of Object.entries(licensePatterns)) {
    if (pattern.test(content)) {
      return license;
    }
  }

  return null;
}

// METRIC CALCULATION FUNCTIONS

async function busFactor(uniqueContributors: any[]) {

  // Sort contributors by number of commits
  uniqueContributors.sort((a: number[], b: number[]) => b[1] - a[1]);

  let totalContributors = uniqueContributors.length;
  let totalCommits = 0;
  let cumulativeCommits = 0;
  let cumulativeContributors = 0;

  for (const [_, commits] of uniqueContributors) {
    totalCommits += commits;
  }

  for (const [_, commits] of uniqueContributors) {
      cumulativeCommits += commits;
      cumulativeContributors++;

      if (cumulativeCommits >= totalCommits * ACCUMULATION) {
          break;
      }
  }

  let busFactorValue = cumulativeContributors / totalContributors;

  // test log statements
  // console.log('Total Contributors:', totalContributors);

  const busFactorEnd = Date.now();

  return {busFactorValue, busFactorEnd};
}

async function responsiveness(issueDurations: any[]) {

  let responsivenessValue = 1;

  const sum = issueDurations.reduce((a: any, b: any) => a + b, 0);
  const average = sum / issueDurations.length;
  responsivenessValue = (1 - (average / 365));

  if(responsivenessValue === null){
    responsivenessValue = 0;
  }

  // test log statements
  // console.log('Ratio (open/total):', ratio);
  // console.log('Average Duration (days):', average);

  const responsivenessEnd = Date.now();

  return {responsivenessValue, responsivenessEnd};
}

async function correctness(openIssues: number, closedIssues: number) {
  let correctnessValue = 1;
  let ratio = openIssues / (openIssues + closedIssues);
  correctnessValue = 1 - ratio;

  if(correctnessValue === null){
    correctnessValue = 0;
  }

  // test log statements
  // console.log('Ratio (open/total):', ratio);

  const correctnessEnd = Date.now();

  return {correctnessValue, correctnessEnd};
}

async function rampUpTime(readme: fs.PathLike | fs.promises.FileHandle | null){
  if (!readme) {
    throw new Error('Readme file not found');
  }
  const readmeContent = await fs.promises.readFile(readme, 'utf8');
  let rampUpTimeValue = 0;

  const headings = [
    /installation/i,
    /usage/i,
    /configuration/i,
    /(faq|help)/i,
    /resources/i
  ];

  let foundHeadings = 0;

  for (const heading of headings) {
    if (heading.test(readmeContent)) {
      foundHeadings++;
    }
  }

  // Calculate ramp-up time value based on the number of found headings
  rampUpTimeValue = foundHeadings / headings.length;

  const rampUpTimeEnd = Date.now();

  return {rampUpTimeValue, rampUpTimeEnd};
}

async function licensing(license: string | null) {

  let licenseCompatabilityValue = 1;
  if (license === null) {
    const licenseEnd = Date.now();
    licenseCompatabilityValue = 0;
    return {licenseCompatabilityValue, licenseEnd};
  }

  const licenseEnd = Date.now();
  return {licenseCompatabilityValue, licenseEnd};
}

async function calculateScore(busFactorValue: number, responsivenessValue: number, correctnessValue: number, rampUpTimeValue: number, licensingValue: number) {

  let weightedBusFactor = busFactorValue * WEIGHT_BUS_FACTOR;
  let weightedResponsiveness = responsivenessValue * WEIGHT_RESPONSIVENESS;
  let weightedCorrectness = correctnessValue * WEIGHT_CORRECTNESS;
  let weightedRampUpTime = rampUpTimeValue * WEIGHT_RAMP_UP_TIME;
  let weightedLicensing = licensingValue * WEIGHT_LICENSING;
  let sumWeights = WEIGHT_BUS_FACTOR + WEIGHT_RESPONSIVENESS + WEIGHT_CORRECTNESS + WEIGHT_RAMP_UP_TIME + WEIGHT_LICENSING;

  let score = (weightedBusFactor + weightedResponsiveness + weightedCorrectness + weightedRampUpTime + weightedLicensing) / sumWeights;
  return score;
}
