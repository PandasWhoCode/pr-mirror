const loadWithMocks = async (
  values: any,
  opts?: {
    ghInstalled?: boolean;
    auth?: any;
    throwParse?: boolean;
    throwIn?: 'mirror' | 'sync' | 'createPr';
    verifyAnswer?: string;
  }
) => {
  jest.resetModules();

  jest.doMock('node:readline/promises', () => ({
    createInterface: () => ({
      question: async () => opts?.verifyAnswer ?? '',
      close: () => undefined,
    }),
  }));

  jest.doMock('node:util', () => ({
    parseArgs: () => {
      if (opts?.throwParse) throw new Error('parse exploded');
      return { values };
    },
  }));

  const mirrorMock = jest.fn();
  const syncMock = jest.fn();
  const createPrMock = jest.fn();

  if (opts?.throwIn === 'mirror')
    mirrorMock.mockImplementation(() => {
      throw new Error('mirror fail');
    });
  if (opts?.throwIn === 'sync')
    syncMock.mockImplementation(() => {
      throw new Error('sync fail');
    });
  if (opts?.throwIn === 'createPr')
    createPrMock.mockImplementation(() => {
      throw new Error('create fail');
    });

  jest.doMock('../src/mirror', () => ({ mirror: mirrorMock }));
  jest.doMock('../src/sync', () => ({ sync: syncMock }));
  jest.doMock('../src/createpr', () => ({ createPr: createPrMock }));

  const getGitHubAuthMock = jest.fn(() => opts?.auth ?? { token: 't', username: 'u' });
  const checkGhInstalledMock = jest.fn(() => opts?.ghInstalled ?? true);

  jest.doMock('../src/utils', () => ({
    getGitHubAuth: getGitHubAuthMock,
    checkGhInstalled: checkGhInstalledMock,
  }));

  const mod = await import('../src/prmirror');

  return {
    prMirror: mod.prMirror,
    mirrorMock,
    syncMock,
    createPrMock,
    getGitHubAuthMock,
    checkGhInstalledMock,
  };
};

describe('prmirror', () => {
  beforeEach(() => {
    delete process.env.DEFAULT_BASE;
    delete process.env.DEFAULT_ORG;
    delete process.env.DEFAULT_REPO;
  });

  it('verify aborts when not confirmed', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror, mirrorMock, createPrMock } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: false, verify: true },
      { verifyAnswer: 'n' }
    );

    await expect(prMirror()).rejects.toThrow('exit:0');
    expect(mirrorMock).not.toHaveBeenCalled();
    expect(createPrMock).not.toHaveBeenCalled();

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('verify proceeds when confirmed', async () => {
    const { prMirror, mirrorMock, createPrMock } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: false, verify: true },
      { verifyAnswer: 'y' }
    );

    await prMirror();
    expect(mirrorMock).toHaveBeenCalled();
    expect(createPrMock).toHaveBeenCalled();
  });

  it('verify proceeds when confirmed (sync path)', async () => {
    const { prMirror, syncMock, mirrorMock, createPrMock } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: true, verify: true },
      { verifyAnswer: 'yes' }
    );

    await prMirror();
    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(mirrorMock).not.toHaveBeenCalled();
    expect(createPrMock).not.toHaveBeenCalled();
  });

  it('shows help and exits 0', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({ help: true, sync: false, verify: false });

    await expect(prMirror()).rejects.toThrow('exit:0');

    expect(exitSpy).toHaveBeenCalledWith(0);
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('uses env defaults when args missing and runs mirror+createPr', async () => {
    process.env.DEFAULT_BASE = 'main';
    process.env.DEFAULT_ORG = 'Org';
    process.env.DEFAULT_REPO = 'Repo';

    const { prMirror, mirrorMock, createPrMock } = await loadWithMocks({
      number: '5',
      sync: false,
      verify: false,
    });

    await prMirror();

    expect(mirrorMock).toHaveBeenCalled();
    expect(createPrMock).toHaveBeenCalled();
  });

  it('runs sync path when -s is set', async () => {
    const { prMirror, syncMock, mirrorMock, createPrMock } = await loadWithMocks({
      base: 'main',
      number: '5',
      org: 'Org',
      repo: 'Repo',
      sync: true,
      verify: false,
    });

    await prMirror();

    expect(syncMock).toHaveBeenCalledTimes(1);
    expect(mirrorMock).not.toHaveBeenCalled();
    expect(createPrMock).not.toHaveBeenCalled();
  });

  it('exits 1 when parsing throws', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({}, { throwParse: true });

    await expect(prMirror()).rejects.toThrow('exit:1');

    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 when gh is not installed', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: false, verify: false },
      { ghInstalled: false }
    );

    await expect(prMirror()).rejects.toThrow('exit:1');

    errSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 when missing required base', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({
      number: '5',
      org: 'Org',
      repo: 'Repo',
      sync: false,
      verify: false,
    });

    await expect(prMirror()).rejects.toThrow('exit:1');

    errSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 when PR number is missing', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({
      base: 'main',
      org: 'Org',
      repo: 'Repo',
      sync: false,
      verify: false,
    });

    await expect(prMirror()).rejects.toThrow('exit:1');

    errSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 when PR number is invalid', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({
      base: 'main',
      number: 'nope',
      org: 'Org',
      repo: 'Repo',
      sync: false,
      verify: false,
    });

    await expect(prMirror()).rejects.toThrow('exit:1');

    errSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 when missing org', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({
      base: 'main',
      number: '5',
      repo: 'Repo',
      sync: false,
      verify: false,
    });

    await expect(prMirror()).rejects.toThrow('exit:1');

    errSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits 1 when missing repo', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks({
      base: 'main',
      number: '5',
      org: 'Org',
      sync: false,
      verify: false,
    });

    await expect(prMirror()).rejects.toThrow('exit:1');

    errSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('prefers CLI args over env defaults', async () => {
    process.env.DEFAULT_BASE = 'env-base';
    process.env.DEFAULT_ORG = 'env-org';
    process.env.DEFAULT_REPO = 'env-repo';

    const { prMirror, mirrorMock } = await loadWithMocks({
      base: 'cli-base',
      number: '5',
      org: 'cli-org',
      repo: 'cli-repo',
      sync: false,
      verify: false,
    });

    await prMirror();

    expect(mirrorMock).toHaveBeenCalledWith({
      base: 'cli-base',
      number: 5,
      org: 'cli-org',
      repo: 'cli-repo',
      sync: false,
      verify: false,
    });
  });

  it('catches runtime errors from mirror and exits 1', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: false, verify: false },
      { throwIn: 'mirror' }
    );

    await expect(prMirror()).rejects.toThrow('exit:1');

    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('catches runtime errors from sync and exits 1', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: true, verify: false },
      { throwIn: 'sync' }
    );

    await expect(prMirror()).rejects.toThrow('exit:1');

    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('catches runtime errors from createPr and exits 1', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { prMirror } = await loadWithMocks(
      { base: 'main', number: '5', org: 'Org', repo: 'Repo', sync: false, verify: false },
      { throwIn: 'createPr' }
    );

    await expect(prMirror()).rejects.toThrow('exit:1');

    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
