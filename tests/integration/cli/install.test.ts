// tests/integration/cli/install.test.ts
//
// Integration tests for `kernelcad install <target>`. For each target we
// simulate the on-disk config layout in a tmpdir (via `--config-dir`) and
// assert the resulting JSON / delegated invocation. For the two delegated
// targets (claude-code, codex) we inject a fake `runCommand` runner so the
// test doesn't depend on the host having the upstream CLI installed.

import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildServerEntry,
  configFilePath,
  defaultConfigDir,
  runInstall,
  type InstallOptions,
  type InstallTarget,
} from '../../../src/agent/cli/commands/install';

function freshTmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

// ---------------------------------------------------------------------------
// OS-aware path detection
// ---------------------------------------------------------------------------

describe('install: default config dir resolution', () => {
  it('claude-desktop: uses ~/Library/Application Support/Claude on macOS', () => {
    const home = '/Users/alice';
    expect(defaultConfigDir('claude-desktop', { homeOverride: home, platformOverride: 'darwin' }))
      .toBe('/Users/alice/Library/Application Support/Claude');
  });

  it('claude-desktop: uses %APPDATA%/Claude on Windows', () => {
    expect(defaultConfigDir('claude-desktop', {
      homeOverride: 'C:\\Users\\alice',
      platformOverride: 'win32',
      appDataOverride: 'C:\\Users\\alice\\AppData\\Roaming',
    })).toBe('C:\\Users\\alice\\AppData\\Roaming/Claude');
  });

  it('claude-desktop: uses ~/.config/Claude on Linux', () => {
    expect(defaultConfigDir('claude-desktop', { homeOverride: '/home/alice', platformOverride: 'linux' }))
      .toBe('/home/alice/.config/Claude');
  });

  it('cursor: uses ~/.cursor on all platforms', () => {
    expect(defaultConfigDir('cursor', { homeOverride: '/home/alice', platformOverride: 'linux' }))
      .toBe('/home/alice/.cursor');
    expect(defaultConfigDir('cursor', { homeOverride: '/Users/alice', platformOverride: 'darwin' }))
      .toBe('/Users/alice/.cursor');
  });

  it('codex: uses ~/.codex on all platforms', () => {
    expect(defaultConfigDir('codex', { homeOverride: '/home/alice', platformOverride: 'linux' }))
      .toBe('/home/alice/.codex');
  });
});

describe('install: configFilePath joins target file correctly', () => {
  it.each<[InstallTarget, string]>([
    ['claude-desktop', 'claude_desktop_config.json'],
    ['cursor', 'mcp.json'],
    ['claude-code', '.claude.json'],
    ['codex', 'config.toml'],
  ])('%s -> ends with %s', (target, expected) => {
    const dir = '/tmp/xyz';
    const filePath = configFilePath(target, { configDir: dir });
    expect(filePath.endsWith(expected)).toBe(true);
    expect(filePath.startsWith(dir)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JSON-write targets: claude-desktop and cursor
// ---------------------------------------------------------------------------

describe.each<InstallTarget>(['claude-desktop', 'cursor'])('install: %s (JSON write)', (target) => {
  const fileName = target === 'claude-desktop' ? 'claude_desktop_config.json' : 'mcp.json';

  it('writes a fresh config with mcpServers.kernelcad when the directory is empty', () => {
    const dir = freshTmp(`kc-install-${target}-`);
    const result = runInstall(target, { configDir: dir });

    expect('path' in result).toBe(true);
    if (!('path' in result)) return;

    expect(result.path).toBe(join(dir, fileName));
    expect(result.changed).toBe(true);
    expect(existsSync(result.path)).toBe(true);

    const written = JSON.parse(readFileSync(result.path, 'utf8')) as {
      mcpServers: { kernelcad: { command: string; args: string[] } };
    };
    expect(written.mcpServers).toBeDefined();
    expect(written.mcpServers.kernelcad).toBeDefined();
    expect(written.mcpServers.kernelcad.command).toBe('npx');
    // No token: local stdio mode — no --cloud / --token in args.
    expect(written.mcpServers.kernelcad.args).toEqual(['-y', 'kernelcad', 'mcp']);
  });

  it('uses --cloud --token when --token is provided', () => {
    const dir = freshTmp(`kc-install-${target}-token-`);
    const result = runInstall(target, { configDir: dir, token: 'kcl_TESTTOKEN' });
    if (!('path' in result)) throw new Error('expected MergeResult');
    const written = JSON.parse(readFileSync(result.path, 'utf8')) as {
      mcpServers: { kernelcad: { args: string[] } };
    };
    expect(written.mcpServers.kernelcad.args)
      .toEqual(['-y', 'kernelcad', 'mcp', '--cloud', '--token', 'kcl_TESTTOKEN']);
  });

  it('preserves other mcpServers entries when merging', () => {
    const dir = freshTmp(`kc-install-${target}-preserve-`);
    const filePath = join(dir, fileName);
    writeFileSync(filePath, JSON.stringify({
      mcpServers: {
        otherServer: { command: 'node', args: ['/path/to/other.js'] },
      },
    }, null, 2), 'utf8');

    runInstall(target, { configDir: dir, token: 'TOK' });

    const written = JSON.parse(readFileSync(filePath, 'utf8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(Object.keys(written.mcpServers).sort()).toEqual(['kernelcad', 'otherServer']);
    expect(written.mcpServers.otherServer)
      .toEqual({ command: 'node', args: ['/path/to/other.js'] });
  });

  it('preserves unrelated top-level keys', () => {
    const dir = freshTmp(`kc-install-${target}-toplevel-`);
    const filePath = join(dir, fileName);
    writeFileSync(filePath, JSON.stringify({
      someOtherSetting: { foo: 'bar' },
      mcpServers: {},
    }, null, 2), 'utf8');

    runInstall(target, { configDir: dir });

    const written = JSON.parse(readFileSync(filePath, 'utf8')) as { someOtherSetting: unknown };
    expect(written.someOtherSetting).toEqual({ foo: 'bar' });
  });

  it('is idempotent: second run with identical args reports no change', () => {
    const dir = freshTmp(`kc-install-${target}-idem-`);
    const r1 = runInstall(target, { configDir: dir, token: 'SAME' });
    const r2 = runInstall(target, { configDir: dir, token: 'SAME' });
    if (!('changed' in r1) || !('changed' in r2)) throw new Error('expected MergeResult');
    expect(r1.changed).toBe(true);
    expect(r2.changed).toBe(false);
    expect(r2.summary).toMatch(/already up to date|no-op/);
  });

  it('replaces the token but preserves siblings when re-run with a different token', () => {
    const dir = freshTmp(`kc-install-${target}-rotate-`);
    const filePath = join(dir, fileName);
    writeFileSync(filePath, JSON.stringify({
      mcpServers: {
        sibling: { command: 'node', args: ['x.js'] },
      },
    }, null, 2), 'utf8');

    runInstall(target, { configDir: dir, token: 'OLD' });
    runInstall(target, { configDir: dir, token: 'NEW' });

    const written = JSON.parse(readFileSync(filePath, 'utf8')) as {
      mcpServers: { kernelcad: { args: string[] }; sibling: unknown };
    };
    expect(written.mcpServers.kernelcad.args).toContain('NEW');
    expect(written.mcpServers.kernelcad.args).not.toContain('OLD');
    expect(written.mcpServers.sibling).toEqual({ command: 'node', args: ['x.js'] });
  });

  it('--dry-run does not touch the filesystem and summary says "Would write"', () => {
    const dir = freshTmp(`kc-install-${target}-dry-`);
    const filePath = join(dir, fileName);
    const result = runInstall(target, { configDir: dir, dryRun: true });
    if (!('path' in result)) throw new Error('expected MergeResult');
    expect(result.changed).toBe(true);   // would change
    expect(existsSync(filePath)).toBe(false);
    expect(result.summary).toMatch(/dry-run/i);
    expect(result.summary).not.toMatch(/^Wrote /);
  });

  it('errors clearly when the parent config directory does not exist', () => {
    const missing = join(tmpdir(), `kc-install-missing-${Date.now()}-${Math.random()}`);
    expect(() => runInstall(target, { configDir: missing }))
      .toThrow(/does not exist|not installed/i);
  });

  it('refuses to overwrite a malformed config file', () => {
    const dir = freshTmp(`kc-install-${target}-malformed-`);
    const filePath = join(dir, fileName);
    writeFileSync(filePath, '{this is not valid json', 'utf8');
    expect(() => runInstall(target, { configDir: dir }))
      .toThrow(/malformed|Refusing/i);
  });

  it('rejects a non-object JSON root (e.g. array)', () => {
    const dir = freshTmp(`kc-install-${target}-array-`);
    const filePath = join(dir, fileName);
    writeFileSync(filePath, '[]', 'utf8');
    expect(() => runInstall(target, { configDir: dir }))
      .toThrow(/malformed|Refusing/i);
  });

  it('summary includes a restart hint on success', () => {
    const dir = freshTmp(`kc-install-${target}-hint-`);
    const r = runInstall(target, { configDir: dir });
    if (!('summary' in r)) throw new Error('expected MergeResult');
    expect(r.summary).toMatch(/Restart/i);
  });
});

// ---------------------------------------------------------------------------
// Delegated targets: claude-code, codex
// ---------------------------------------------------------------------------

interface CapturedCall { cmd: string; args: string[]; }

function makeRunner(opts: {
  hasBinary?: boolean;
  addStatus?: number;
  addStderr?: string;
}): { runner: InstallOptions['runCommand']; calls: CapturedCall[] } {
  const hasBinary = opts.hasBinary ?? true;
  const calls: CapturedCall[] = [];
  const runner: InstallOptions['runCommand'] = (cmd, args) => {
    calls.push({ cmd, args });
    if (cmd === 'which' || cmd === 'where') {
      return { status: hasBinary ? 0 : 1, stdout: '', stderr: '' };
    }
    if (args[0] === 'mcp' && args[1] === 'remove') {
      // mimic CLI returning non-zero when entry doesn't exist; install should
      // tolerate this.
      return { status: 1, stdout: '', stderr: 'no such server' };
    }
    if (args[0] === 'mcp' && args[1] === 'add') {
      return { status: opts.addStatus ?? 0, stdout: '', stderr: opts.addStderr ?? '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  };
  return { runner, calls };
}

describe.each<{ target: InstallTarget; bin: string }>([
  { target: 'claude-code', bin: 'claude' },
  { target: 'codex', bin: 'codex' },
])('install: $target (delegates to $bin CLI)', ({ target, bin }) => {
  it('errors with install hint when the upstream CLI is not on PATH', () => {
    const { runner } = makeRunner({ hasBinary: false });
    expect(() => runInstall(target, { runCommand: runner }))
      .toThrow(new RegExp(`${bin} CLI not found`, 'i'));
  });

  it('invokes `${bin} mcp add kernelcad` with the right argv (no token)', () => {
    const { runner, calls } = makeRunner({});
    const r = runInstall(target, { runCommand: runner });
    if (!('command' in r)) throw new Error('expected DelegateResult');
    expect(r.changed).toBe(true);

    const addCall = calls.find(c => c.cmd === bin && c.args[0] === 'mcp' && c.args[1] === 'add');
    expect(addCall).toBeDefined();
    expect(addCall!.args).toContain('kernelcad');
    expect(addCall!.args).toContain('--');
    expect(addCall!.args).toContain('npx');
    expect(addCall!.args).toContain('-y');
    expect(addCall!.args).not.toContain('--token');
  });

  it('passes --cloud --token <X> through to `npx kernelcad mcp` when token is set', () => {
    const { runner, calls } = makeRunner({});
    runInstall(target, { runCommand: runner, token: 'kcl_DELEGATED_TOKEN' });

    const addCall = calls.find(c => c.cmd === bin && c.args[0] === 'mcp' && c.args[1] === 'add');
    expect(addCall).toBeDefined();
    expect(addCall!.args).toContain('--cloud');
    const tokIdx = addCall!.args.indexOf('--token');
    expect(tokIdx).toBeGreaterThan(-1);
    expect(addCall!.args[tokIdx + 1]).toBe('kcl_DELEGATED_TOKEN');
  });

  it('uses --scope user only for the claude binary', () => {
    const { runner, calls } = makeRunner({});
    runInstall(target, { runCommand: runner });
    const addCall = calls.find(c => c.cmd === bin && c.args[0] === 'mcp' && c.args[1] === 'add')!;
    const usesScope = addCall.args.includes('--scope');
    if (bin === 'claude') {
      expect(usesScope).toBe(true);
      const scopeIdx = addCall.args.indexOf('--scope');
      expect(addCall.args[scopeIdx + 1]).toBe('user');
    } else {
      expect(usesScope).toBe(false);
    }
  });

  it('--dry-run prints the planned command without running mcp add', () => {
    const { runner, calls } = makeRunner({});
    const r = runInstall(target, { runCommand: runner, dryRun: true, token: 'SECRET' });
    if (!('command' in r)) throw new Error('expected DelegateResult');
    expect(r.changed).toBe(false);
    expect(r.command).toContain(`${bin} mcp add kernelcad`);
    // Redacts the token in the printed command line.
    expect(r.command).not.toContain('SECRET');
    expect(r.command).toContain('<redacted>');

    // Only the `which` probe ran — no mcp add.
    const addCall = calls.find(c => c.args[0] === 'mcp' && c.args[1] === 'add');
    expect(addCall).toBeUndefined();
  });

  it('surfaces a clear error if the delegated CLI exits non-zero', () => {
    const { runner } = makeRunner({ addStatus: 2, addStderr: 'oh no' });
    expect(() => runInstall(target, { runCommand: runner }))
      .toThrow(/mcp add failed.*oh no/);
  });

  it('tolerates `mcp remove` returning non-zero (entry may not exist yet)', () => {
    const { runner } = makeRunner({}); // remove returns 1, add returns 0
    expect(() => runInstall(target, { runCommand: runner })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Server-entry builder
// ---------------------------------------------------------------------------

describe('install: buildServerEntry', () => {
  it('local mode (no token)', () => {
    expect(buildServerEntry()).toEqual({ command: 'npx', args: ['-y', 'kernelcad', 'mcp'] });
  });
  it('cloud mode (with token)', () => {
    expect(buildServerEntry('X'))
      .toEqual({ command: 'npx', args: ['-y', 'kernelcad', 'mcp', '--cloud', '--token', 'X'] });
  });
});

// ---------------------------------------------------------------------------
// Token-leak guard
// ---------------------------------------------------------------------------

describe('install: token is not leaked to logs / summaries', () => {
  it('JSON-write target: summary text does not echo the token', () => {
    const dir = freshTmp('kc-install-leak-');
    const r = runInstall('claude-desktop', { configDir: dir, token: 'kcl_DO_NOT_LEAK' });
    if (!('summary' in r)) throw new Error('expected MergeResult');
    expect(r.summary).not.toContain('kcl_DO_NOT_LEAK');
  });

  it('Delegated target: dry-run printable command redacts the token', () => {
    const { runner } = makeRunner({});
    const r = runInstall('claude-code', {
      runCommand: runner, dryRun: true, token: 'kcl_DO_NOT_LEAK',
    });
    if (!('command' in r)) throw new Error('expected DelegateResult');
    expect(r.command).not.toContain('kcl_DO_NOT_LEAK');
    expect(r.summary).not.toContain('kcl_DO_NOT_LEAK');
  });
});

// ---------------------------------------------------------------------------
// Smoke: the installCommand() Command object exists and accepts the four flags.
// ---------------------------------------------------------------------------

describe('install: commander wiring', () => {
  it('registers all four target flags + --token + --dry-run', async () => {
    const { installCommand } = await import('../../../src/agent/cli/commands/install');
    const cmd = installCommand();
    const longs = cmd.options.map(o => o.long);
    expect(longs).toEqual(expect.arrayContaining([
      '--claude-desktop', '--claude-code', '--codex', '--cursor',
      '--token', '--dry-run', '--config-dir',
    ]));
  });
});

// ---------------------------------------------------------------------------
// Cross-target: directory layout simulation
// ---------------------------------------------------------------------------

describe('install: simulates real OS layouts via --config-dir', () => {
  it('claude-desktop into a tmpdir layout mimicking ~/Library/Application Support/Claude', () => {
    const fakeHome = freshTmp('kc-fakehome-');
    const claudeDir = join(fakeHome, 'Library', 'Application Support', 'Claude');
    mkdirSync(claudeDir, { recursive: true });

    const r = runInstall('claude-desktop', { configDir: claudeDir, token: 'TOK' });
    if (!('path' in r)) throw new Error('expected MergeResult');
    expect(r.path).toBe(join(claudeDir, 'claude_desktop_config.json'));
    expect(existsSync(r.path)).toBe(true);
  });

  it('cursor into a tmpdir layout mimicking ~/.cursor', () => {
    const fakeHome = freshTmp('kc-fakehome-');
    const cursorDir = join(fakeHome, '.cursor');
    mkdirSync(cursorDir, { recursive: true });

    const r = runInstall('cursor', { configDir: cursorDir });
    if (!('path' in r)) throw new Error('expected MergeResult');
    expect(r.path).toBe(join(cursorDir, 'mcp.json'));
    expect(existsSync(r.path)).toBe(true);
  });
});
