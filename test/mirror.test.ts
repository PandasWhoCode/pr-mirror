jest.mock('../src/utils', () => ({
  execVerbose: jest.fn(),
  cleanupMirrorRepo: jest.fn(),
  getMirrorRepoPath: jest.fn(() => '/tmp/mirror-repo'),
}));

import { mirror } from '../src/mirror';
import { execVerbose, cleanupMirrorRepo, getMirrorRepoPath } from '../src/utils';

describe('mirror', () => {
  it('runs expected git commands', () => {
    mirror({ base: 'main', number: 42, org: 'Org', repo: 'Repo', sync: false, verify: false });

    expect(cleanupMirrorRepo).toHaveBeenCalledTimes(1);
    expect(getMirrorRepoPath).toHaveBeenCalledTimes(1);

    expect(execVerbose).toHaveBeenCalledWith('git clone "git@github.com:Org/Repo" mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith(
      'git fetch origin pull/42/head:pr-temp',
      '/tmp/mirror-repo'
    );
    expect(execVerbose).toHaveBeenCalledWith('git checkout pr-temp', '/tmp/mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith('git checkout -b "mirror/pr-42"', '/tmp/mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith(
      'git commit --allow-empty -sS -m "chore: mirror pr-42"',
      '/tmp/mirror-repo'
    );
    expect(execVerbose).toHaveBeenCalledWith(
      'git push -u origin "mirror/pr-42"',
      '/tmp/mirror-repo'
    );
  });
});
