jest.mock('fs', () => ({
  existsSync: jest.fn(),
  rmSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: (...parts: string[]) => parts.join('/'),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

import { existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';

import {
  debugLog,
  checkGhInstalled,
  cleanupMirrorRepo,
  getMirrorRepoPath,
  execVerbose,
} from '../src/utils';

describe('utils (additional coverage)', () => {
  beforeEach(() => {
    (existsSync as jest.Mock).mockReset();
    (rmSync as jest.Mock).mockReset();
    (execSync as jest.Mock).mockReset();
    delete process.env.DEBUG;
  });

  it('debugLog does nothing when DEBUG is not true', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    debugLog('hi');
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('debugLog logs when DEBUG=true', () => {
    process.env.DEBUG = 'true';
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    debugLog('hi');
    expect(logSpy).toHaveBeenCalledWith('[DEBUG] hi');
    logSpy.mockRestore();
  });

  it('checkGhInstalled returns true when which gh succeeds', () => {
    (execSync as jest.Mock).mockReturnValue('');
    expect(checkGhInstalled()).toBe(true);
  });

  it('checkGhInstalled returns false when which gh fails', () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('no gh');
    });
    expect(checkGhInstalled()).toBe(false);
  });

  it('cleanupMirrorRepo removes mirror-repo directory if it exists', () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    cleanupMirrorRepo();
    expect(rmSync).toHaveBeenCalledWith(expect.stringContaining('mirror-repo'), {
      recursive: true,
      force: true,
    });
  });

  it('cleanupMirrorRepo does nothing if mirror-repo does not exist', () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    cleanupMirrorRepo();
    expect(rmSync).not.toHaveBeenCalled();
  });

  it('getMirrorRepoPath uses process.cwd()', () => {
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/work');
    expect(getMirrorRepoPath()).toBe('/work/mirror-repo');
    cwdSpy.mockRestore();
  });

  it('execVerbose throws a formatted error when execSync fails', () => {
    const err: any = new Error('boom');
    err.stdout = 'out';
    err.stderr = 'err';
    (execSync as jest.Mock).mockImplementation(() => {
      throw err;
    });

    expect(() => execVerbose('git status')).toThrow(/Command failed: git status/);
    expect(() => execVerbose('git status')).toThrow(/stdout:/);
    expect(() => execVerbose('git status')).toThrow(/stderr:/);
  });

  it('execVerbose does not throw on success', () => {
    (execSync as jest.Mock).mockReturnValue('');
    expect(() => execVerbose('git status')).not.toThrow();
  });

  it('execVerbose error formatting omits stdout/stderr sections when they are not strings', () => {
    const err: any = new Error('boom');
    err.stdout = Buffer.from('out');
    err.stderr = undefined;
    (execSync as jest.Mock).mockImplementation(() => {
      throw err;
    });

    try {
      execVerbose('git status');
    } catch (e: any) {
      expect(e.message).not.toMatch(/stdout:/);
      expect(e.message).not.toMatch(/stderr:/);
    }
  });

  it('execVerbose error formatting includes stdout section when only stdout is available', () => {
    const err: any = new Error('boom');
    err.stdout = 'out-only';
    err.stderr = '';
    (execSync as jest.Mock).mockImplementation(() => {
      throw err;
    });

    expect(() => execVerbose('git status')).toThrow(/stdout:\nout-only/);
    expect(() => execVerbose('git status')).not.toThrow(/stderr:/);
  });

  it('execVerbose error formatting includes stderr section when only stderr is available', () => {
    const err: any = new Error('boom');
    err.stdout = '';
    err.stderr = 'err-only';
    (execSync as jest.Mock).mockImplementation(() => {
      throw err;
    });

    expect(() => execVerbose('git status')).toThrow(/stderr:\nerr-only/);
    expect(() => execVerbose('git status')).not.toThrow(/stdout:/);
  });
});
