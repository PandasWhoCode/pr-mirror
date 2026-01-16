import { execSensitive, exec, getGitHubAuth } from '../src/utils';

jest.mock('child_process', () => {
  return {
    execSync: jest.fn(),
  };
});

import { execSync } from 'child_process';

const execSyncMock = execSync as unknown as jest.Mock;

describe('utils', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
    delete process.env.DEBUG;
  });

  describe('execSensitive', () => {
    it('does not include stdout/stderr in the thrown error message', () => {
      const token = 'ghp_SUPER_SECRET_TOKEN_VALUE';
      const err: any = new Error('boom');
      err.stdout = token;
      err.stderr = token;
      execSyncMock.mockImplementation(() => {
        throw err;
      });

      expect(() => execSensitive('gh auth token')).toThrow(/Command failed: \[REDACTED\]/);

      try {
        execSensitive('gh auth token');
      } catch (e: any) {
        expect(e.message).not.toContain(token);
      }
    });

    it('does not log the command in DEBUG mode', () => {
      process.env.DEBUG = 'true';
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      execSyncMock.mockReturnValue('ok');

      execSensitive('gh auth token');

      const combined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(combined).toContain('Executing: [REDACTED]');
      expect(combined).not.toContain('gh auth token');

      logSpy.mockRestore();
    });
  });

  describe('getGitHubAuth', () => {
    it('retrieves token and username using gh commands', () => {
      execSyncMock.mockImplementation((cmd: string) => {
        if (cmd === 'gh auth token') return 'token-from-gh';
        if (cmd === 'gh api user --jq .login') return 'someuser';
        throw new Error(`unexpected command: ${cmd}`);
      });

      const auth = getGitHubAuth();
      expect(auth).toEqual({ token: 'token-from-gh', username: 'someuser' });

      expect(execSyncMock).toHaveBeenCalledWith('gh auth token', expect.any(Object));
      expect(execSyncMock).toHaveBeenCalledWith('gh api user --jq .login', expect.any(Object));
    });
  });

  describe('exec', () => {
    it('includes stdout/stderr in error message for non-sensitive commands', () => {
      const err: any = new Error('boom');
      err.stdout = 'some stdout';
      err.stderr = 'some stderr';
      execSyncMock.mockImplementation(() => {
        throw err;
      });

      expect(() => exec('git status')).toThrow(/stdout:/);
      expect(() => exec('git status')).toThrow(/stderr:/);
    });

    it('does not include stdout/stderr sections when they are not strings', () => {
      const err: any = new Error('boom');
      err.stdout = Buffer.from('not a string');
      err.stderr = undefined;
      execSyncMock.mockImplementation(() => {
        throw err;
      });

      try {
        exec('git status');
      } catch (e: any) {
        expect(e.message).not.toMatch(/stdout:/);
        expect(e.message).not.toMatch(/stderr:/);
      }
    });

    it('trims output on success', () => {
      execSyncMock.mockReturnValue('  ok  ');
      expect(exec('echo ok')).toBe('ok');
    });
  });
});
