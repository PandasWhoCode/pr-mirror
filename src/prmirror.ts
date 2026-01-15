import 'dotenv/config';
import { parseArgs } from 'node:util';
import type { PrMirrorOptions } from './types';
import { getGitHubAuth, checkGhInstalled } from './utils';
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

  console.log(`Usage: prmirror -n NUMBER -b BASE -o ORG -r REPO [-s]

Options:
  -n, --number    PR number to mirror (required)
  -b, --base      Base branch name (can use DEFAULT_BASE env var)
  -o, --org       GitHub organization (can use DEFAULT_ORG env var)
  -r, --repo      GitHub repository name (can use DEFAULT_REPO env var)
  -s, --sync      Sync existing mirror branch (optional)
  -h, --help      Show this help message

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

  # With .env defaults (DEFAULT_ORG, DEFAULT_REPO, DEFAULT_BASE set)
  prmirror -n 123
`);
  process.exit(exitCode);
}

/**
 * Validate the options
 */
function validateOptions(options: Partial<PrMirrorOptions>): asserts options is PrMirrorOptions {
  if (!options.base) {
    showUsage('BASE branch is required');
  }

  if (!options.number || options.number <= 0) {
    showUsage('PR Number is required and must be greater than 0');
  }

  if (!checkGhInstalled()) {
    showUsage("The github cli tool 'gh' must be installed");
  }

  if (!options.org) {
    showUsage('Organization is required');
  }

  if (!options.repo) {
    showUsage('Repository is required');
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
      showUsage(undefined, 0);
    }

    const result: Partial<PrMirrorOptions> = {
      sync: values.sync as boolean
    };

    // Use command line args or fall back to environment variables
    if (values.base) {
      result.base = values.base as string;
    } else if (process.env.DEFAULT_BASE) {
      result.base = process.env.DEFAULT_BASE;
    }

    if (values.number) {
      result.number = Number.parseInt(values.number as string, 10);
    }

    if (values.org) {
      result.org = values.org as string;
    } else if (process.env.DEFAULT_ORG) {
      result.org = process.env.DEFAULT_ORG;
    }

    if (values.repo) {
      result.repo = values.repo as string;
    } else if (process.env.DEFAULT_REPO) {
      result.repo = process.env.DEFAULT_REPO;
    }

    return result;
  } catch (error: any) {
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

