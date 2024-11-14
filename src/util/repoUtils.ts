import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    const repoName = githubUrl.split('/').slice(-1)[0];
    const repoPath = path.join(__dirname, 'cloned_repo', repoName);

    if (!fs.existsSync(path.join(__dirname, 'cloned_repo'))) {
        fs.mkdirSync(path.join(__dirname, 'cloned_repo'));
    }

    const archiveUrl = `${githubUrl.replace('github.com', 'api.github.com/repos')}/zipball/main`;
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`, // Optional if you need authenticated requests
    };

    try {
        // Download the zip file
        console.log(`Downloading repository archive from ${archiveUrl}...`);
        const response = await axios.get(archiveUrl, { headers, responseType: 'arraybuffer' });

        // Write the zip file to disk
        const zipPath = path.join(__dirname, `${repoName}.zip`);
        fs.writeFileSync(zipPath, response.data);

        // Extract the zip file
        console.log('Extracting repository...');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(repoPath, true);

        // Clean up the zip file after extraction
        fs.unlinkSync(zipPath);

        console.log('Repository extracted to:', repoPath);
        return repoPath;
    } catch (error) {
        console.error('Error downloading or extracting repository:', error);
        throw error;
    }
}

export async function cleanUpRepository(repoPath: string): Promise<void> {
	if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
        throw new Error('Failed to delete repository');
    }
    try {
        await execAsync(`rm -rf ${repoPath}`);
    } catch (error) {
        const err = error as Error;
        throw err;
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
    if (!readme) throw new Error('Readme file not found');
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
