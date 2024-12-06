import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import git from "isomorphic-git";
import http from 'isomorphic-git/http/node/index.js';

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

export async function findLicense(repoPath: string, readme: string | null) {
    const entries = await fs.promises.readdir(repoPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().startsWith('license')) {
            const licenseContent = await fs.promises.readFile(path.join(repoPath, entry.name), 'utf8');
            return identifyLicense(licenseContent);
        }
    }
    const packageJsonPath = path.join(repoPath, 'package.json');
    if (entries.some(entry => entry.name === 'package.json')) {
        try {
            const packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);
            if (packageJson.license) {
                return packageJson.license;
            }
        } catch (error) {
            console.error("Error reading or parsing package.json:", error);
        }
    }
    if (!readme) {
        throw new Error('License information not found in LICENSE files, package.json, or README.');
    }
    const readmeContent = await fs.promises.readFile(readme, 'utf8');
    return identifyLicense(readmeContent);
}

export function identifyLicense(content: string) {
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
        if (pattern.test(content)) return license;
    }

    return null;
}
