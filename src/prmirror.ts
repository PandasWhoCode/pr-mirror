import 'dotenv/config';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import type { PrMirrorOptions } from './types';
import { getGitHubAuth, checkGhInstalled, cleanupMirrorRepo } from './utils';
import { mirror } from './mirror';
import { sync } from './sync';
import { createPr } from './createpr';

/**
 * Show usage information and exit
 */
function showUsage(errorMessage?: string, exitCode: number = 1): never {
  if (errorMessage) {
    console.error(`\n❌ Error: ${errorMessage}\n`);
  }

  console.log(`Usage: prmirror -b BASE -n NUMBER -o ORG -r REPO [-d] [-s] [-v]

Options:
  -b, --base              Base branch name (can use DEFAULT_BASE env var)
  -c, --clean             Clean up mirror-repo directory (optional)
  -d, --deleteAfterAction Clean up mirror-repo directory after action (create, sync) (optional)
  -h, --help              Show this help message
  -n, --number            PR number to mirror (required)
  -o, --org               GitHub organization (can use DEFAULT_ORG env var)
  -r, --repo              GitHub repository name (can use DEFAULT_REPO env var)
  -s, --sync              Sync existing mirror branch (optional)
  -v, --verify            Show resolved inputs and ask for confirmation (optional)

Environment Variables:
  You can set defaults in a .env file to avoid repeating common values:
  - DEFAULT_ORG      Default GitHub organization
  - DEFAULT_REPO     Default repository name
  - DEFAULT_BASE     Default base branch
  - DEBUG            Set to 'true' for verbose logging

Examples:
  # Mirror a new PR
  prmirror -n 123 -b main -o myorg -r myrepo

  # Sync an existing mirrored PR
  prmirror -n 123 -b main -o myorg -r myrepo -s

  # Clean up mirror-repo after action
  prmirror -n 123 -b main -o myorg -r myrepo -d

  # With .env defaults (DEFAULT_ORG, DEFAULT_REPO, DEFAULT_BASE set)
  prmirror -n 123

  # Clean up mirror-repo directory
  prmirror -c
`);
  process.exit(exitCode);
}

/**
 * Validate the options
 */
function validateOptions(options: Partial<PrMirrorOptions>): asserts options is PrMirrorOptions {
  if (!options.number || options.number <= 0) {
    showUsage('PR Number is required and must be greater than 0');
  }

  if (!checkGhInstalled()) {
    showUsage("The github cli tool 'gh' must be installed");
  }

  if (!options.org && !process.env.DEFAULT_ORG) {
    showUsage('Organization is required');
  }

  if (!options.repo && !process.env.DEFAULT_REPO) {
    showUsage('Repository is required');
  }
}

async function verifyOptionsOrExit(options: PrMirrorOptions): Promise<void> {
  if (!options.verify) return;

  const yesNo = (value: boolean): string => (value ? 'yes' : 'no');

  console.log('Verify inputs:');
  console.log(`  PR #:   ${options.number}`);
  console.log(`  Base:   ${options.base}`);
  console.log(`  Org:    ${options.org}`);
  console.log(`  Repo:   ${options.repo}`);
  console.log(`  Sync:   ${yesNo(options.sync)}`);
  console.log(`  Clean:  ${yesNo(options.clean)}`);
  console.log(`  Delete after action:  ${yesNo(options.deleteAfterAction)}`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Proceed? (y/n): ');
  rl.close();

  const normalized = answer.trim().toLowerCase();
  const proceed = normalized === 'y' || normalized === 'yes';

  if (!proceed) {
    console.log('Aborted.');
    process.exit(0);
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
          description: 'Base branch name',
        },
        number: {
          type: 'string',
          short: 'n',
          description: 'PR number to mirror',
        },
        org: {
          type: 'string',
          short: 'o',
          description: 'GitHub organization',
        },
        repo: {
          type: 'string',
          short: 'r',
          description: 'GitHub repository name',
        },
        sync: {
          type: 'boolean',
          short: 's',
          description: 'Sync existing mirror branch',
          default: false,
        },
        clean: {
          type: 'boolean',
          short: 'c',
          description: 'Clean up mirror-repo directory',
          default: false,
        },
        deleteAfterAction: {
          type: 'boolean',
          short: 'd',
          description: 'Delete mirror-repo directory after action (create, sync)',
          default: false,
        },
        verify: {
          type: 'boolean',
          short: 'v',
          description: 'Show resolved inputs and ask for confirmation',
          default: false,
        },
        help: {
          type: 'boolean',
          short: 'h',
          description: 'Show help',
          default: false,
        },
      },
      allowPositionals: false,
    });

    if (values.help) {
      showUsage(undefined, 0);
    }

    const result: Partial<PrMirrorOptions> = {
      sync: values.sync as boolean,
      clean: values.clean as boolean,
      deleteAfterAction: values.deleteAfterAction as boolean,
      verify: values.verify as boolean,
    };

    // Use command line args or fall back to environment variables
    if (values.base) {
      result.base = values.base as string;
    } else if (process.env.DEFAULT_BASE) {
      result.base = process.env.DEFAULT_BASE;
    } else {
      result.base = 'main';
    }

    if (values.number) {
      result.number = Number.parseInt(values.number as string, 10);
    }

    if (values.org) {
      result.org = values.org as string;
    } else if (process.env.DEFAULT_ORG) {
      result.org = process.env.DEFAULT_ORG;
    } else {
      result.org = '';
    }

    if (values.repo) {
      result.repo = values.repo as string;
    } else if (process.env.DEFAULT_REPO) {
      result.repo = process.env.DEFAULT_REPO;
    } else {
      result.repo = '';
    }

    return result;
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('exit:')) {
      throw error;
    }
    showUsage(`Error parsing arguments: ${error.message}`);
  }
}

/**
 * Main function - performs the mirroring functionality
 * This is the main method of this file. It does argument parsing and gathers
 * necessary information for mirroring a PR. It also will ensure environment
 * variables are properly configured.
 */
export async function prMirror(): Promise<void> {
  const options = parseCliArgs();

  if (options.clean) {
    console.log('Cleaning mirror-repo directory...');
    cleanupMirrorRepo();
    console.log('Cleaned mirror-repo directory.');
    process.exit(0);
  }

  validateOptions(options);

  await verifyOptionsOrExit(options);

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

    // if deleteAfterAction is true, delete the mirror-repo directory
    if (options.deleteAfterAction) {
      console.log('Deleting mirror-repo directory after action...');
      cleanupMirrorRepo();
      console.log('Deleted mirror-repo directory after action.');
    }

    console.log('\n✓ Success!');
  } catch (error: any) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}
