jest.mock('../src/utils', () => ({
  exec: jest.fn(() => 'mirror/pr-42'),
  execVerbose: jest.fn(),
  getMirrorRepoPath: jest.fn(() => '/tmp/mirror-repo'),
}));

import { createPr } from '../src/createpr';
import { exec, execVerbose, getMirrorRepoPath } from '../src/utils';

describe('createPr', () => {
  it('creates PR using gh with correct args', () => {
    createPr(
      { base: 'main', number: 42, org: 'Org', repo: 'Repo', sync: false, verify: false },
      { token: 'token', username: 'someuser' }
    );

    expect(getMirrorRepoPath).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', '/tmp/mirror-repo');

    expect(execVerbose).toHaveBeenCalledWith(
      'gh pr create -a someuser -B main --fill-verbose -H mirror/pr-42 -R "Org/Repo" -t "chore: Mirror PR-42"',
      '/tmp/mirror-repo'
    );
  });
});
