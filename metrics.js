"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoData = getRepoData;
var axios_1 = require("axios");
var dotenv = require("dotenv");
var simple_git_1 = require("simple-git");
var path = require("path");
var fs = require("fs");
// Load environment variables from .env file
dotenv.config();
// GLOBAL CONSTANTS
var ACCUMULATION = 0.975;
var WEIGHT_BUS_FACTOR = 0.22;
var WEIGHT_RESPONSIVENESS = 0.2;
var WEIGHT_CORRECTNESS = 0.2;
var WEIGHT_RAMP_UP_TIME = 0.2;
var WEIGHT_LICENSING = 0.2;
var GIT = (0, simple_git_1.default)();
// MAIN FUNCTIONS
function convertToApiUrl(githubUrl) {
    return githubUrl.replace('github.com', 'api.github.com/repos');
}
function getGithubUrlFromNpm(npmUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var packageName, response, repositoryUrl, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    packageName = npmUrl.split('/').pop();
                    if (!packageName) {
                        console.error('Invalid npm package URL.');
                        return [2 /*return*/, null];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1.default.get("https://registry.npmjs.org/".concat(packageName))];
                case 2:
                    response = _b.sent();
                    repositoryUrl = (_a = response.data.repository) === null || _a === void 0 ? void 0 : _a.url;
                    if (repositoryUrl && repositoryUrl.includes('github.com')) {
                        return [2 /*return*/, repositoryUrl.replace(/^git\+/, '').replace(/\.git$/, '')];
                    }
                    else {
                        console.error('GitHub repository URL not found in npm package data.');
                        return [2 /*return*/, null];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    console.error('Error fetching npm package data:', error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function cloneRepo(githubUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var repoName, repoPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    repoName = githubUrl.split('/').slice(-1)[0];
                    repoPath = path.join(__dirname, 'cloned_repo', repoName);
                    return [4 /*yield*/, GIT.clone(githubUrl, repoPath, ['--depth', '1'])];
                case 1:
                    _a.sent();
                    // console.log('Cloned repo to:', repoPath);
                    return [2 /*return*/, repoPath];
            }
        });
    });
}
function getRepoData(githubUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var clockStart, npmGithubUrl, GITHUB_API_URL, commitsUrl, issuesUrl, headers, repoPath, readme, license, uniqueContributors, _a, openIssues, closedIssues, issueDurations, _b, _c, busFactorValue, busFactorEnd, _d, correctnessValue, correctnessEnd, _e, responsivenessValue, responsivenessEnd, _f, rampUpTimeValue, rampUpTimeEnd, _g, licenseCompatabilityValue, licenseEnd, score, scoreEnd, busFactorLatency, correctnessLatency, responsivenessLatency, rampUpTimeLatency, licenseCompatabilityLatency, scoreLatency, error_2;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    clockStart = Date.now();
                    if (!githubUrl) {
                        console.error(githubUrl, ' is not a valid link');
                        return [2 /*return*/];
                    }
                    if (!githubUrl.includes('npmjs.com')) return [3 /*break*/, 2];
                    return [4 /*yield*/, getGithubUrlFromNpm(githubUrl)];
                case 1:
                    npmGithubUrl = _h.sent();
                    if (npmGithubUrl) {
                        githubUrl = npmGithubUrl;
                    }
                    else {
                        return [2 /*return*/];
                    }
                    _h.label = 2;
                case 2:
                    GITHUB_API_URL = convertToApiUrl(githubUrl);
                    _h.label = 3;
                case 3:
                    _h.trys.push([3, 11, , 12]);
                    commitsUrl = "".concat(GITHUB_API_URL, "/commits");
                    issuesUrl = "".concat(GITHUB_API_URL, "/issues");
                    headers = {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': "token ".concat(process.env.GITHUB_TOKEN)
                    };
                    return [4 /*yield*/, cloneRepo(githubUrl)];
                case 4:
                    repoPath = _h.sent();
                    return [4 /*yield*/, findReadme(repoPath)];
                case 5:
                    readme = _h.sent();
                    return [4 /*yield*/, findLicense(repoPath, readme)];
                case 6:
                    license = _h.sent();
                    return [4 /*yield*/, fetchCommits(commitsUrl, headers)];
                case 7:
                    uniqueContributors = _h.sent();
                    return [4 /*yield*/, fetchIssues(issuesUrl, headers)];
                case 8:
                    _a = _h.sent(), openIssues = _a.openIssues, closedIssues = _a.closedIssues, issueDurations = _a.issueDurations;
                    return [4 /*yield*/, Promise.all([
                            busFactor(uniqueContributors),
                            correctness(openIssues, closedIssues),
                            responsiveness(issueDurations),
                            rampUpTime(readme),
                            licensing(license)
                        ])];
                case 9:
                    _b = _h.sent(), _c = _b[0], busFactorValue = _c.busFactorValue, busFactorEnd = _c.busFactorEnd, _d = _b[1], correctnessValue = _d.correctnessValue, correctnessEnd = _d.correctnessEnd, _e = _b[2], responsivenessValue = _e.responsivenessValue, responsivenessEnd = _e.responsivenessEnd, _f = _b[3], rampUpTimeValue = _f.rampUpTimeValue, rampUpTimeEnd = _f.rampUpTimeEnd, _g = _b[4], licenseCompatabilityValue = _g.licenseCompatabilityValue, licenseEnd = _g.licenseEnd;
                    return [4 /*yield*/, calculateScore(busFactorValue, responsivenessValue, correctnessValue, rampUpTimeValue, licenseCompatabilityValue)];
                case 10:
                    score = _h.sent();
                    scoreEnd = Date.now();
                    busFactorLatency = (busFactorEnd - clockStart) / 1000;
                    correctnessLatency = (correctnessEnd - clockStart) / 1000;
                    responsivenessLatency = (responsivenessEnd - clockStart) / 1000;
                    rampUpTimeLatency = (rampUpTimeEnd - clockStart) / 1000;
                    licenseCompatabilityLatency = (licenseEnd - clockStart) / 1000;
                    scoreLatency = (scoreEnd - clockStart) / 1000;
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
                    return [2 /*return*/, {
                            busFactorValue: busFactorValue,
                            busFactorLatency: busFactorLatency,
                            responsivenessValue: responsivenessValue,
                            responsivenessLatency: responsivenessLatency,
                            correctnessValue: correctnessValue,
                            correctnessLatency: correctnessLatency,
                            rampUpTimeValue: rampUpTimeValue,
                            rampUpTimeLatency: rampUpTimeLatency,
                            licenseCompatabilityValue: licenseCompatabilityValue,
                            licenseCompatabilityLatency: licenseCompatabilityLatency,
                            score: score,
                            scoreLatency: scoreLatency
                        }];
                case 11:
                    error_2 = _h.sent();
                    //console.log('Error fetching repo data for ', githubUrl);
                    return [2 /*return*/, {
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
                        }];
                case 12: return [2 /*return*/];
            }
        });
    });
}
// API FETCH FUNCTIONS
function fetchCommits(commitsUrl, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var page, totalCommits, uniqueContributors, hasMoreCommits, response, commits;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    page = 1;
                    totalCommits = 0;
                    uniqueContributors = new Map();
                    hasMoreCommits = true;
                    _a.label = 1;
                case 1:
                    if (!hasMoreCommits) return [3 /*break*/, 3];
                    return [4 /*yield*/, axios_1.default.get("".concat(commitsUrl, "?page=").concat(page, "&per_page=100"), { headers: headers })];
                case 2:
                    response = _a.sent();
                    commits = response.data;
                    totalCommits += commits.length;
                    // Add unique contributor names and number of times they appear
                    commits.forEach(function (commit) {
                        if (commit.author && commit.author.login) {
                            var login = commit.author.login;
                            if (uniqueContributors.has(login)) {
                                uniqueContributors.set(login, uniqueContributors.get(login) + 1);
                            }
                            else {
                                uniqueContributors.set(login, 1);
                            }
                        }
                    });
                    hasMoreCommits = commits.length === 100;
                    page++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, Array.from(uniqueContributors)];
            }
        });
    });
}
function fetchIssues(issuesUrl, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var page, hasMoreIssues, openIssues, closedIssues, issueDurations, response, issues;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    page = 1;
                    hasMoreIssues = true;
                    openIssues = 0;
                    closedIssues = 0;
                    issueDurations = [];
                    _a.label = 1;
                case 1:
                    if (!hasMoreIssues) return [3 /*break*/, 3];
                    return [4 /*yield*/, axios_1.default.get("".concat(issuesUrl, "?page=").concat(page, "&per_page=100&state=all"), { headers: headers })];
                case 2:
                    response = _a.sent();
                    issues = response.data;
                    issues.forEach(function (issue) {
                        if (issue.closed_at) {
                            var createdAt = new Date(issue.created_at);
                            var closedAt = new Date(issue.closed_at);
                            var duration = (closedAt.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
                            issueDurations.push(duration);
                            closedIssues++;
                        }
                        else {
                            openIssues++;
                        }
                    });
                    hasMoreIssues = issues.length === 100;
                    page++;
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/, {
                        openIssues: openIssues,
                        closedIssues: closedIssues,
                        issueDurations: issueDurations
                    }];
            }
        });
    });
}
// REPO SEARCH FUNCTIONS
function fileExists(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.promises.access(filePath, fs.constants.F_OK)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function findReadme(repoPath) {
    return __awaiter(this, void 0, void 0, function () {
        var entries, _i, entries_1, entry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.promises.readdir(repoPath, { withFileTypes: true })];
                case 1:
                    entries = _a.sent();
                    for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                        entry = entries_1[_i];
                        if (entry.isFile() && entry.name.toLowerCase().startsWith('readme')) {
                            return [2 /*return*/, path.join(repoPath, entry.name)];
                        }
                    }
                    return [2 /*return*/, null];
            }
        });
    });
}
function findLicense(repoPath, readme) {
    return __awaiter(this, void 0, void 0, function () {
        var entries, _i, entries_2, entry, licensePath, licenseContent, license, readmeContent, readmeLicense;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.promises.readdir(repoPath, { withFileTypes: true })];
                case 1:
                    entries = _a.sent();
                    _i = 0, entries_2 = entries;
                    _a.label = 2;
                case 2:
                    if (!(_i < entries_2.length)) return [3 /*break*/, 5];
                    entry = entries_2[_i];
                    if (!(entry.isFile() && entry.name.toLowerCase().startsWith('license'))) return [3 /*break*/, 4];
                    licensePath = path.join(repoPath, entry.name);
                    return [4 /*yield*/, fs.promises.readFile(licensePath, 'utf8')];
                case 3:
                    licenseContent = _a.sent();
                    license = identifyLicense(licenseContent);
                    if (license !== null) {
                        return [2 /*return*/, license];
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    // check for a license in the readme
                    if (!readme) {
                        throw new Error('Readme file not found');
                    }
                    return [4 /*yield*/, fs.promises.readFile(readme, 'utf8')];
                case 6:
                    readmeContent = _a.sent();
                    readmeLicense = identifyLicense(readmeContent);
                    if (readmeLicense !== null) {
                        return [2 /*return*/, readmeLicense];
                    }
                    return [2 /*return*/, null];
            }
        });
    });
}
function identifyLicense(content) {
    var licensePatterns = {
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
    for (var _i = 0, _a = Object.entries(licensePatterns); _i < _a.length; _i++) {
        var _b = _a[_i], license = _b[0], pattern = _b[1];
        if (pattern.test(content)) {
            return license;
        }
    }
    return null;
}
// METRIC CALCULATION FUNCTIONS
function busFactor(uniqueContributors) {
    return __awaiter(this, void 0, void 0, function () {
        var totalContributors, totalCommits, cumulativeCommits, cumulativeContributors, _i, uniqueContributors_1, _a, _, commits, _b, uniqueContributors_2, _c, _, commits, busFactorValue, busFactorEnd;
        return __generator(this, function (_d) {
            // Sort contributors by number of commits
            uniqueContributors.sort(function (a, b) { return b[1] - a[1]; });
            totalContributors = uniqueContributors.length;
            totalCommits = 0;
            cumulativeCommits = 0;
            cumulativeContributors = 0;
            for (_i = 0, uniqueContributors_1 = uniqueContributors; _i < uniqueContributors_1.length; _i++) {
                _a = uniqueContributors_1[_i], _ = _a[0], commits = _a[1];
                totalCommits += commits;
            }
            for (_b = 0, uniqueContributors_2 = uniqueContributors; _b < uniqueContributors_2.length; _b++) {
                _c = uniqueContributors_2[_b], _ = _c[0], commits = _c[1];
                cumulativeCommits += commits;
                cumulativeContributors++;
                if (cumulativeCommits >= totalCommits * ACCUMULATION) {
                    break;
                }
            }
            busFactorValue = cumulativeContributors / totalContributors;
            busFactorEnd = Date.now();
            return [2 /*return*/, { busFactorValue: busFactorValue, busFactorEnd: busFactorEnd }];
        });
    });
}
function responsiveness(issueDurations) {
    return __awaiter(this, void 0, void 0, function () {
        var responsivenessValue, sum, average, responsivenessEnd;
        return __generator(this, function (_a) {
            responsivenessValue = 1;
            sum = issueDurations.reduce(function (a, b) { return a + b; }, 0);
            average = sum / issueDurations.length;
            responsivenessValue = (1 - (average / 365));
            responsivenessEnd = Date.now();
            return [2 /*return*/, { responsivenessValue: responsivenessValue, responsivenessEnd: responsivenessEnd }];
        });
    });
}
function correctness(openIssues, closedIssues) {
    return __awaiter(this, void 0, void 0, function () {
        var correctnessValue, ratio, correctnessEnd;
        return __generator(this, function (_a) {
            correctnessValue = 1;
            ratio = openIssues / (openIssues + closedIssues);
            correctnessValue = 1 - ratio;
            correctnessEnd = Date.now();
            return [2 /*return*/, { correctnessValue: correctnessValue, correctnessEnd: correctnessEnd }];
        });
    });
}
function rampUpTime(readme) {
    return __awaiter(this, void 0, void 0, function () {
        var readmeContent, rampUpTimeValue, headings, foundHeadings, _i, headings_1, heading, rampUpTimeEnd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!readme) {
                        throw new Error('Readme file not found');
                    }
                    return [4 /*yield*/, fs.promises.readFile(readme, 'utf8')];
                case 1:
                    readmeContent = _a.sent();
                    rampUpTimeValue = 0;
                    headings = [
                        /installation/i,
                        /usage/i,
                        /configuration/i,
                        /(faq|help)/i,
                        /resources/i
                    ];
                    foundHeadings = 0;
                    for (_i = 0, headings_1 = headings; _i < headings_1.length; _i++) {
                        heading = headings_1[_i];
                        if (heading.test(readmeContent)) {
                            foundHeadings++;
                        }
                    }
                    // Calculate ramp-up time value based on the number of found headings
                    rampUpTimeValue = foundHeadings / headings.length;
                    rampUpTimeEnd = Date.now();
                    return [2 /*return*/, { rampUpTimeValue: rampUpTimeValue, rampUpTimeEnd: rampUpTimeEnd }];
            }
        });
    });
}
function licensing(license) {
    return __awaiter(this, void 0, void 0, function () {
        var licenseCompatabilityValue, licenseEnd_1, licenseEnd;
        return __generator(this, function (_a) {
            licenseCompatabilityValue = 1;
            if (license === null) {
                licenseEnd_1 = Date.now();
                licenseCompatabilityValue = 0;
                return [2 /*return*/, { licenseCompatabilityValue: licenseCompatabilityValue, licenseEnd: licenseEnd_1 }];
            }
            licenseEnd = Date.now();
            return [2 /*return*/, { licenseCompatabilityValue: licenseCompatabilityValue, licenseEnd: licenseEnd }];
        });
    });
}
function calculateScore(busFactorValue, responsivenessValue, correctnessValue, rampUpTimeValue, licensingValue) {
    return __awaiter(this, void 0, void 0, function () {
        var weightedBusFactor, weightedResponsiveness, weightedCorrectness, weightedRampUpTime, weightedLicensing, sumWeights, score;
        return __generator(this, function (_a) {
            weightedBusFactor = busFactorValue * WEIGHT_BUS_FACTOR;
            weightedResponsiveness = responsivenessValue * WEIGHT_RESPONSIVENESS;
            weightedCorrectness = correctnessValue * WEIGHT_CORRECTNESS;
            weightedRampUpTime = rampUpTimeValue * WEIGHT_RAMP_UP_TIME;
            weightedLicensing = licensingValue * WEIGHT_LICENSING;
            sumWeights = WEIGHT_BUS_FACTOR + WEIGHT_RESPONSIVENESS + WEIGHT_CORRECTNESS + WEIGHT_RAMP_UP_TIME + WEIGHT_LICENSING;
            score = (weightedBusFactor + weightedResponsiveness + weightedCorrectness + weightedRampUpTime + weightedLicensing) / sumWeights;
            return [2 /*return*/, score];
        });
    });
}
