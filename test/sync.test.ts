jest.mock('../src/utils', () => ({
  execVerbose: jest.fn(),
  cleanupMirrorRepo: jest.fn(),
  getMirrorRepoPath: jest.fn(() => '/tmp/mirror-repo'),
}));

import { sync } from '../src/sync';
import { execVerbose, cleanupMirrorRepo, getMirrorRepoPath } from '../src/utils';

describe('sync', () => {
  it('runs expected git commands', () => {
    sync({ base: 'main', number: 7, org: 'Org', repo: 'Repo', sync: true });

    expect(cleanupMirrorRepo).toHaveBeenCalledTimes(1);
    expect(getMirrorRepoPath).toHaveBeenCalledTimes(1);

    expect(execVerbose).toHaveBeenCalledWith('git clone "git@github.com:Org/Repo" mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith('git fetch origin pull/7/head:pr-temp', '/tmp/mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith('git checkout "mirror/pr-7"', '/tmp/mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith('git reset --hard pr-temp', '/tmp/mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith('git commit --allow-empty -sS -m "chore: mirror pr-7 (sync)"', '/tmp/mirror-repo');
    expect(execVerbose).toHaveBeenCalledWith('git push -f origin "mirror/pr-7"', '/tmp/mirror-repo');
  });
});
