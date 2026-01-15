import type { PrMirrorOptions } from './types';
import { execVerbose, cleanupMirrorRepo, getMirrorRepoPath } from './utils';

/**
 * The Mirror method performs the mirroring functionality necessary to set up a new branch
 * within the github repository with all changes from the originating PR.
 */
export function mirror(options: PrMirrorOptions): void {
  // Clean up mirror-repo directory if it exists
  cleanupMirrorRepo();

  const mirrorRepoPath = getMirrorRepoPath();

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
  execVerbose(
    `git commit --allow-empty -sS -m "chore: mirror pr-${options.number}"`,
    mirrorRepoPath
  );
  execVerbose(`git push -u origin "mirror/pr-${options.number}"`, mirrorRepoPath);
}
