import type { PrMirrorOptions } from './types';
import { execVerbose, cleanupMirrorRepo, getMirrorRepoPath } from './utils';

/**
 * The Sync method will synchronize the local repository with the remote
 */
export function sync(options: PrMirrorOptions): void {
  // Clean up mirror-repo directory if it exists
  cleanupMirrorRepo();

  const mirrorRepoPath = getMirrorRepoPath();

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

