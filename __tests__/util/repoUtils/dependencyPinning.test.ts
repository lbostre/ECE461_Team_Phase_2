// __tests__/util/repoUtils/dependencyPinning.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dependencyPinning } from '../../../src/util/repoUtils';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs');
vi.mock('path');

describe('dependencyPinning', () => {
  const repoPath = '/fake/repo';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should assign full score if package.json does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await dependencyPinning(repoPath);

    expect(fs.existsSync).toHaveBeenCalledWith(path.join(repoPath, 'package.json'));
    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should assign full score if there are no dependencies', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({}));

    const result = await dependencyPinning(repoPath);

    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should calculate correct score when all dependencies are pinned', async () => {
    const packageJson = {
      dependencies: {
        'dep1': '1.0.0',
        'dep2': '2.3.4',
      },
      devDependencies: {
        'devDep1': '0.1.2',
      },
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

    const result = await dependencyPinning(repoPath);

    expect(result.value).toBe(1.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should calculate correct score when some dependencies are unpinned', async () => {
    const packageJson = {
      dependencies: {
        'dep1': '^1.0.0',
        'dep2': '2.3.4',
      },
      devDependencies: {
        'devDep1': '~0.1.2',
        'devDep2': '0.1.2',
      },
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

    const result = await dependencyPinning(repoPath);

    // Total dependencies: 4
    // Pinned dependencies: dep2 (2.3.4), devDep2 (0.1.2)
    // So pinned: 2 / 4 = 0.5
    expect(result.value).toBe(0.5);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('should calculate correct score when all dependencies are unpinned', async () => {
    const packageJson = {
      dependencies: {
        'dep1': '^1.0.0',
        'dep2': '~2.3.4',
      },
      devDependencies: {
        'devDep1': '>0.1.2',
      },
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(packageJson));

    const result = await dependencyPinning(repoPath);

    expect(result.value).toBe(0.0);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });
});