import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import git from "isomorphic-git";
import http from 'isomorphic-git/http/node/index.js';
import { PullRequest, PullRequestFile } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function convertToApiUrl(githubUrl: string) {
    return githubUrl.replace('github.com', 'api.github.com/repos');
}

export async function getGithubUrlFromNpm(npmUrl: string): Promise<string | null> {
    const packageName = npmUrl.split('/').pop();
    if (!packageName) throw new Error('Invalid npm package URL');

    const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
    const repositoryUrl = response.data.repository?.url;
    return repositoryUrl?.replace(/^git\+/, '').replace(/\.git$/, '') || null;
}

export async function cloneRepo(githubUrl: string) {
    const [owner, repo] = githubUrl.split('/').slice(-2);
    const tempRepoPath = path.join('/tmp', 'cloned_repo', repo);

    // Ensure the base temporary directory exists
    if (!fs.existsSync(tempRepoPath)) {
        fs.mkdirSync(tempRepoPath, { recursive: true });
    }

    try {
        // Clone the entire repository into the temporary path
        console.log(`Cloning repository ${repo} into ${tempRepoPath}...`);
        await git.clone({
            fs,
            http,
            dir: tempRepoPath,
            url: `https://github.com/${owner}/${repo}`,
            singleBranch: true,  
            depth: 1,          
        });

        console.log(`Repository fully cloned to: ${tempRepoPath}`);
        return tempRepoPath;
    } catch (error) {
        console.error('Error cloning repository:', error);
        throw error;
    }
}

export async function cleanUpRepository(repoPath: string): Promise<void> {
    if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
        throw new Error('Failed to delete repository: path does not exist or is not a directory');
    }
    try {
        // Use fs.promises.rm for recursive deletion
        await fs.promises.rm(repoPath, { recursive: true, force: true });
        console.log(`Successfully deleted repository at ${repoPath}`);
    } catch (error) {
        console.error(`Error deleting repository at ${repoPath}:`, error);
        throw error;
    }
}

export async function fileExists(filePath: fs.PathLike) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

export async function findReadme(repoPath: string) {
    const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().startsWith('readme')) {
            return path.join(repoPath, entry.name);
        }
    }
    return null;
}

export async function findLicense(repoPath: string): Promise<string | null> {
    let licenseResult: string | null = null;
    const packageJsonPath = path.join(repoPath, 'package.json');
    try {
        const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        if (packageJson.license) {
            const identifiedLicense = identifyLicense(packageJson.license);
            if (identifiedLicense) {
                licenseResult = licenseResult || identifiedLicense; 
            }
        }
    } catch (error) {
        console.error("Error reading or parsing package.json:", error);
    }
    try {
        const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile() && entry.name.toLowerCase().startsWith('license')) {
                const licenseContent = await fs.promises.readFile(path.join(repoPath, entry.name), 'utf8');
                const identifiedLicense = identifyLicense(licenseContent);
                if (identifiedLicense) {
                    licenseResult = licenseResult || identifiedLicense; 
                }
            }
        }
    } catch (error) {
        console.error("Error reading LICENSE files:", error);
    }
    if (!licenseResult) {
        throw new Error('License information not found in LICENSE files, package.json, or README.');
    }

    return licenseResult;
}

export function identifyLicense(content: string) {
    const licensePatterns: { [key: string]: RegExp } = {
        // MIT License variations
        'MIT': /\bmit\b|\bmit license\b|\blicensed under the mit license\b/i,
    
        // Apache License variations
        'Apache 2.0': /\bapache\b.*(2\.0|version 2\.0)|\blicensed under the apache license, version 2\.0\b/i,
    
        // GPL (General Public License) variations
        'GPL v2.0': /\bgpl\b.*(2\.0|version 2)|\bgnu general public license, version 2\b/i,
        'GPL v3.0': /\bgpl\b.*(3\.0|version 3)|\bgnu general public license, version 3\b/i,
    
        // LGPL (Lesser General Public License) variations
        'LGPL v2.1': /\blgpl\b.*(2\.1|version 2\.1)|\bgnu lesser general public license, version 2\.1\b/i,
        'LGPL v3.0': /\blgpl\b.*(3\.0|version 3)|\bgnu lesser general public license, version 3\b/i,
    
        // BSD License variations
        'BSD 2-Clause': /\bbsd\b.*(2-clause|simplified license)|\blicensed under the bsd 2-clause license\b/i,
        'BSD 3-Clause': /\bbsd\b.*(3-clause|revised|new license)|\blicensed under the bsd 3-clause license\b/i,
    
        // Mozilla Public License variations
        'MPL 2.0': /\bmozilla\b.*(2\.0|version 2\.0)|\blicensed under the mozilla public license, version 2\.0\b/i,
    
        // Common Development and Distribution License variations
        'CDDL 1.0': /\bcddl\b.*(1\.0|version 1\.0)|\blicensed under the common development and distribution license, version 1\.0\b/i,
    
        // Eclipse Public License variations
        'EPL 2.0': /\bepl\b.*(2\.0|version 2\.0)|\blicensed under the eclipse public license, version 2\.0\b/i
    };    

    for (const [license, pattern] of Object.entries(licensePatterns)) {
        if (pattern.test(content)) return license;
    }

    return null;
}

export async function dependencyPinning(repoPath: string): Promise<{ value: number; latency: number }> {
    const start = Date.now();
    const fs = await import('fs');
    const path = await import('path');
    const packageJsonPath = path.join(repoPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        console.warn('No package.json found. Assigning full score for no dependencies.');
        return { value: 1.0, latency: (Date.now() - start) / 1000 };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const dependencies: Record<string, string> = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
    };

    const totalDependencies = Object.keys(dependencies).length;

    if (totalDependencies === 0) {
        return { value: 1.0, latency: (Date.now() - start) / 1000 };
    }

    const pinnedDependencies = Object.values(dependencies).filter((version) =>
        /^\d+\.\d+\.\d+$/.test(version)
    ).length;

    return {
        value: pinnedDependencies / totalDependencies,
        latency: (Date.now() - start) / 1000,
    };
}

export async function codeReviewCoverage(
    repoURL: string,
    headers: Record<string, string>
  ): Promise<{ value: number; latency: number }> {
    const start = Date.now();
    const pullsUrl = `${repoURL}/pulls?state=closed&per_page=100`;
  
    try {
      const pullRequestsResponse = await axios.get(pullsUrl, { headers });
      const pullRequests: PullRequest[] = pullRequestsResponse.data;
  
      if (!Array.isArray(pullRequests) || pullRequests.length === 0) {
        return { value: 1.0, latency: (Date.now() - start) / 1000 };
      }
  
      // Filter only merged PRs
      const mergedPRs = pullRequests.filter((pr) => pr.merged_at);
  
      if (mergedPRs.length === 0) {
        return { value: 1.0, latency: (Date.now() - start) / 1000 };
      }
  
      let reviewedLOC = 0;
      let totalLOC = 0;
  
      // Fetch PR files for each merged PR
      for (const pr of mergedPRs) {
        try {
          const prFilesUrl = `${repoURL}/pulls/${pr.number}/files`;
          const prFilesResponse = await axios.get(prFilesUrl, { headers });
          const prFiles: PullRequestFile[] = prFilesResponse.data;
  
          const loc = prFiles.reduce((sum, file) => sum + file.changes, 0);
          totalLOC += loc;
  
          // If PR has requested reviewers, count LOC as reviewed
          if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
            reviewedLOC += loc;
          }
        } catch (error) {
          console.error(`Error fetching files for PR #${pr.number}:`, error);
          // Skip this PR if there was an error fetching its files
        }
      }
  
      // Calculate coverage
      const coverage = totalLOC === 0 ? 1.0 : reviewedLOC / totalLOC;
  
      return { value: coverage, latency: (Date.now() - start) / 1000 };
    } catch (error) {
      console.error('Error fetching code review coverage:', error);
      return { value: 0, latency: (Date.now() - start) / 1000 };
    }
}