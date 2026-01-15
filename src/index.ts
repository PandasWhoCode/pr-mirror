#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';

interface PrMirrorOptions {
  base: string;
  number: number;
  org: string;
  repo: string;
  sync: boolean;
}

interface GitHubAuth {
  token: string;
  username: string;
}

/**
 * Execute a shell command and return the output
 */
function exec(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Execute a shell command and display output to console
 */
function execVerbose(command: string, cwd?: string): void {
  try {
    execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Get GitHub authentication information
 */
function getGitHubAuth(): GitHubAuth {
  const token = exec('gh auth token');
  const username = exec('gh api user --jq .login');
  return { token, username };
}

/**
 * Check if GitHub CLI is installed
 */
function checkGhInstalled(): boolean {
  try {
    exec('which gh');
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up the mirror-repo directory if it exists
 */
function cleanupMirrorRepo(): void {
  const mirrorRepoPath = join(process.cwd(), 'mirror-repo');
  if (existsSync(mirrorRepoPath)) {
    rmSync(mirrorRepoPath, { recursive: true, force: true });
  }
}

/**
 * Create PR method will create a PR in the specified github organization & repo
 * against the base branch specified when the prmirror script was called. The
 * PR will be titled "chore: PR-[PR-NUMBER]. The PR will automatically be assigned
 * to the user currently authenticated with the Github CLI Tool (gh).
 */
function createPr(options: PrMirrorOptions, auth: GitHubAuth): void {
  const mirrorRepoPath = join(process.cwd(), 'mirror-repo');
  const gitBranch = exec('git rev-parse --abbrev-ref HEAD', mirrorRepoPath);

  const prCommand = `gh pr create -a ${auth.username} -B ${options.base} --fill-verbose -H ${gitBranch} -R "${options.org}/${options.repo}" -t "chore: Mirror PR-${options.number}"`;

  execVerbose(prCommand, mirrorRepoPath);
}

/**
 * The Sync method will synchronize the local repository with the remote
 */
function sync(options: PrMirrorOptions): void {
  // Clean up mirror-repo directory if it exists
  cleanupMirrorRepo();

  const mirrorRepoPath = join(process.cwd(), 'mirror-repo');

  // clone the repo and navigate into it.
  console.log(`Cloning repository ${options.org}/${options.repo}...`);
  execVerbose(`git clone "git@github.com:${options.org}/${options.repo}" mirror-repo`);

  // Fetch the latest PR head into a temp branch
  console.log(`Fetching PR #${options.number}...`);
  execVerbose(`git fetch origin pull/${options.number}/head:pr-temp`, mirrorRepoPath);

  // Checkout the mirror branch
  console.log(`Checking out mirror/pr-${options.number}...`);
  execVerbose(`git checkout "mirror/pr-${options.number}"`, mirrorRepoPath);

  // Hard reset the mirror branch to match the PR head
  console.log('Resetting branch to match PR head...');
  execVerbose('git reset --hard pr-temp', mirrorRepoPath);

  // Add the sync commit
  console.log('Creating sync commit...');
  execVerbose(`git commit --allow-empty -sS -m "chore: mirror pr-${options.number} (sync)"`, mirrorRepoPath);

  // Force-push the updated mirror branch
  console.log('Force-pushing changes...');
  execVerbose(`git push -f origin "mirror/pr-${options.number}"`, mirrorRepoPath);
}

/**
 * The Mirror method performs the mirroring functionality necessary to set up a new branch
 * within the github repository with all changes from the originating PR.
 */
function mirror(options: PrMirrorOptions): void {
  // Clean up mirror-repo directory if it exists
  cleanupMirrorRepo();

  const mirrorRepoPath = join(process.cwd(), 'mirror-repo');

  // clone the repo and navigate into it.
  console.log(`Cloning repository ${options.org}/${options.repo}...`);
  execVerbose(`git clone "git@github.com:${options.org}/${options.repo}" mirror-repo`);

  // fetch the pull request and add to a temporary branch
  console.log(`Fetching PR #${options.number}...`);
  execVerbose(`git fetch origin pull/${options.number}/head:pr-temp`, mirrorRepoPath);

  // checkout the mirror branch
  console.log('Creating mirror branch...');
  execVerbose('git checkout pr-temp', mirrorRepoPath);
  execVerbose(`git checkout -b "mirror/pr-${options.number}"`, mirrorRepoPath);

  // push an empty commit for traceability
  console.log('Creating tracking commit...');
  execVerbose(`git commit --allow-empty -sS -m "chore: mirror pr-${options.number}"`, mirrorRepoPath);
  execVerbose(`git push -u origin "mirror/pr-${options.number}"`, mirrorRepoPath);
}

/**
 * Validate the options
 */
function validateOptions(options: Partial<PrMirrorOptions>): asserts options is PrMirrorOptions {
  if (!options.base) {
    console.error('BASE branch is required.');
    process.exit(1);
  }

  if (!options.number || options.number <= 0) {
    console.error('PR Number is required.');
    process.exit(1);
  }

  if (!checkGhInstalled()) {
    console.error("The github cli tool 'gh' must be installed.");
    process.exit(1);
  }

  if (!options.org) {
    console.error('Organization is required.');
    process.exit(1);
  }

  if (!options.repo) {
    console.error('Repository is required.');
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): Partial<PrMirrorOptions> {
  try {
    const { values } = parseArgs({
      options: {
        base: {
          type: 'string',
          short: 'b',
          description: 'Base branch name'
        },
        number: {
          type: 'string',
          short: 'n',
          description: 'PR number to mirror'
        },
        org: {
          type: 'string',
          short: 'o',
          description: 'GitHub organization'
        },
        repo: {
          type: 'string',
          short: 'r',
          description: 'GitHub repository name'
        },
        sync: {
          type: 'boolean',
          short: 's',
          description: 'Sync existing mirror branch',
          default: false
        },
        help: {
          type: 'boolean',
          short: 'h',
          description: 'Show help',
          default: false
        }
      },
      allowPositionals: false
    });

    if (values.help) {
      console.log(`
Usage: prmirror -n NUMBER -b BASE -o ORG -r REPO [-s]

Options:
  -n, --number    PR number to mirror (required)
  -b, --base      Base branch name (required)
  -o, --org       GitHub organization (required)
  -r, --repo      GitHub repository name (required)
  -s, --sync      Sync existing mirror branch (optional)
  -h, --help      Show this help message

Examples:
  # Mirror a new PR
  prmirror -n 123 -b main -o myorg -r myrepo

  # Sync an existing mirrored PR
  prmirror -n 123 -b main -o myorg -r myrepo -s
`);
      process.exit(0);
    }

    const result: Partial<PrMirrorOptions> = {
      sync: values.sync as boolean
    };

    if (values.base) {
      result.base = values.base as string;
    }

    if (values.number) {
      result.number = parseInt(values.number as string, 10);
    }

    if (values.org) {
      result.org = values.org as string;
    }

    if (values.repo) {
      result.repo = values.repo as string;
    }

    return result;
  } catch (error: any) {
    console.error(`Error parsing arguments: ${error.message}`);
    console.error('Usage: prmirror -n NUMBER -b BASE -o ORG -r REPO [-s]');
    process.exit(1);
  }
}

/**
 * Main function - performs the mirroring functionality
 */
async function prMirror(): Promise<void> {
  const options = parseCliArgs();
  validateOptions(options);

  // The GITHUB_TOKEN and GITHUB_UNAME environment variables
  // are used when creating the PR.
  const auth = getGitHubAuth();
  process.env.GITHUB_TOKEN = auth.token;
  process.env.GITHUB_UNAME = auth.username;

  try {
    if (options.sync) {
      sync(options);
    } else {
      // Call the mirror method
      mirror(options);

      // Call the create PR method
      createPr(options, auth);
    }

    console.log('\n✓ Success!');
  } catch (error: any) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  prMirror().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { prMirror, mirror, sync, createPr };

