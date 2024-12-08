# ECE461_Team_Phase_2

## Overview

This project evaluates npm modules and GitHub repositories by calculating various metric scores to assist developers in selecting reliable open-source modules.

## Team Members

- **Anish Sudini**
- **Leyton Bostre**
- **Adam Kahl**
- **Blake Neely**

## Setup Instructions

1. **Set Environment Variables**:
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   export LOG_FILE=your_log_file_path_here
   export LOG_LEVEL=your_log_level_here
2. **Clone the Repository**:
   ```bash
   git clone https://github.com/lbostre/ECE461_Team_Phase_2
   cd ECE461_Team_Phase_2
3. **Install Dependencies**:
   ```bash
   ./run install

## Usage

1. **Run Individual Tests**:
   ```bash
   ./run <file_name>.txt
2. **Run the Test Suite**:
   ```bash
   ./run test

## Metrics Used to Calculate NetScore
1. Bus Factor: Measures the number of contributors to assess the risk associated with project maintenance.
2. Ramp Up Time: Evaluates the ease of understanding and integrating the project.
3. Correctness: Assesses the presence and quality of test suites to ensure code reliability.
4. Responsive Maintainer: Analyzes the responsiveness of maintainers by examining issue and pull request activity.
5. License: Checks for compatibility with the GNU LGPLv2.1 license.
Each metric is calculated using specific criteria and contributes to the overall NetScore, aiding in the evaluation of open-source modules.

## Repository Structure
.github/workflows/: Contains GitHub Actions workflows.
src/: Source code files.
.gitignore: Specifies files to be ignored by Git.
README.md: Project documentation.
eslint.config.js: ESLint configuration.
index.ts: Main entry point.
package-lock.json: Dependency tree.
package.json: Project metadata and dependencies.
run: Execution script.
run.bat: Windows batch execution script.
test_cases.txt: Test cases for evaluation.
tsconfig.json: TypeScript configuration.
types.ts: Type definitions.

## License 
This project is licensed under the GNU LGPLv2.1 License.
