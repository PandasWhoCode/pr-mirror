jest.mock('../src/prmirror', () => ({
  prMirror: jest.fn(),
}));

jest.mock('../src/mirror', () => ({
  mirror: jest.fn(),
}));

jest.mock('../src/sync', () => ({
  sync: jest.fn(),
}));

jest.mock('../src/createpr', () => ({
  createPr: jest.fn(),
}));

import { prMirror } from '../src/prmirror';
import { handleFatalError, runCli } from '../src/index';

describe('index', () => {
  beforeEach(() => {
    (prMirror as jest.Mock).mockReset();
  });

  it('runCli does nothing when not main', async () => {
    await runCli(false);
    expect(prMirror).not.toHaveBeenCalled();
  });

  it('runCli runs prMirror when main', async () => {
    (prMirror as jest.Mock).mockResolvedValue(undefined);
    await runCli(true);

    expect(prMirror).toHaveBeenCalledTimes(1);
  });

  it('runCli exits(1) when prMirror rejects', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    (prMirror as jest.Mock).mockRejectedValue(new Error('nope'));

    await runCli(true);

    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('re-exports sub-functions', async () => {
    const mod = await import('../src/index');
    expect(typeof mod.prMirror).toBe('function');
    expect(typeof mod.mirror).toBe('function');
    expect(typeof mod.sync).toBe('function');
    expect(typeof mod.createPr).toBe('function');
  });

  it('handleFatalError logs and exits', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    handleFatalError(new Error('boom'));

    expect(errSpy).toHaveBeenCalledWith('Fatal error: boom');
    expect(exitSpy).toHaveBeenCalledWith(1);

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
