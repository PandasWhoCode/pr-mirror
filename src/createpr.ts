import type { PrMirrorOptions, GitHubAuth } from './types';
import { exec, execVerbose, getMirrorRepoPath } from './utils';

/**
 * Create PR method will create a PR in the specified github organization & repo
 * against the base branch specified when the prmirror script was called. The
 * PR will be titled "chore: PR-[PR-NUMBER]. The PR will automatically be assigned
 * to the user currently authenticated with the Github CLI Tool (gh).
 */
export function createPr(options: PrMirrorOptions, auth: GitHubAuth): void {
  const mirrorRepoPath = getMirrorRepoPath();
  const gitBranch = exec('git rev-parse --abbrev-ref HEAD', mirrorRepoPath);

  const prCommand = `gh pr create -a ${auth.username} -B ${options.base} --fill-verbose -H ${gitBranch} -R "${options.org}/${options.repo}" -t "chore: Mirror PR-${options.number}"`;

  execVerbose(prCommand, mirrorRepoPath);
}

