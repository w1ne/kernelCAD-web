import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { tmpdir } from 'node:os';
import { mkdtempSync, symlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { validateOutputPath } from '../../../src/script-runtime/safeOutputPath';

describe('validateOutputPath', () => {
  describe('accepts safe paths', () => {
    it('accepts relative paths within cwd', () => {
      const r = validateOutputPath('./out.stl');
      expect(r.ok).toBe(true);
      expect(r.resolved).toMatch(/\/out\.stl$/);
    });

    it('accepts /tmp/ paths', () => {
      const r = validateOutputPath('/tmp/test.stl');
      expect(r.ok).toBe(true);
      expect(r.resolved).toBe('/tmp/test.stl');
    });

    it('accepts ~/projects/foo.stl', () => {
      const r = validateOutputPath('~/projects/foo.stl');
      expect(r.ok).toBe(true);
      expect(r.resolved).toBe(`${homedir()}/projects/foo.stl`);
    });

    it('accepts subdir of cwd', () => {
      const r = validateOutputPath('out/parts/bracket.stl');
      expect(r.ok).toBe(true);
    });
  });

  describe('rejects path traversal', () => {
    it('rejects path with .. segment', () => {
      const r = validateOutputPath('../escape.stl');
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/path-traversal/);
    });

    it('rejects absolute path with .. segment', () => {
      const r = validateOutputPath('/tmp/safe/../etc/escape.stl');
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/path-traversal/);
    });
  });

  describe('rejects dangerous system paths', () => {
    it('rejects /etc/passwd', () => {
      const r = validateOutputPath('/etc/passwd');
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/system path/);
    });

    it('rejects /proc/self/environ', () => {
      const r = validateOutputPath('/proc/self/environ');
      expect(r.ok).toBe(false);
    });

    it('rejects /sys/fs/cgroup/memory.limit', () => {
      const r = validateOutputPath('/sys/fs/cgroup/memory.limit');
      expect(r.ok).toBe(false);
    });

    it('rejects /dev/null', () => {
      const r = validateOutputPath('/dev/null');
      expect(r.ok).toBe(false);
    });

    it('rejects /root/foo.stl', () => {
      const r = validateOutputPath('/root/foo.stl');
      expect(r.ok).toBe(false);
    });
  });

  describe('rejects user-config paths', () => {
    it('rejects ~/.bashrc', () => {
      const r = validateOutputPath('~/.bashrc');
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/protected user-config/);
    });

    it('rejects ~/.zshrc', () => {
      const r = validateOutputPath('~/.zshrc');
      expect(r.ok).toBe(false);
    });

    it('rejects ~/.ssh/config', () => {
      const r = validateOutputPath('~/.ssh/config');
      expect(r.ok).toBe(false);
    });

    it('rejects ~/.ssh/id_ed25519', () => {
      const r = validateOutputPath('~/.ssh/id_ed25519');
      expect(r.ok).toBe(false);
    });

    it('rejects ~/.gnupg/secring.gpg', () => {
      const r = validateOutputPath('~/.gnupg/secring.gpg');
      expect(r.ok).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('rejects empty string', () => {
      const r = validateOutputPath('');
      expect(r.ok).toBe(false);
    });

    it('rejects non-string input', () => {
      // @ts-expect-error testing runtime guard
      const r = validateOutputPath(null);
      expect(r.ok).toBe(false);
    });

    it('error messages mention an alternative', () => {
      const r = validateOutputPath('/etc/foo.stl');
      expect(r.error).toMatch(/safe path|\/tmp\/|project/i);
    });
  });
});

describe('validateOutputPath — symlink resolution', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'safe-output-symlink-'));
  });

  afterEach(() => {
    if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('rejects a path that resolves through a symlink to a dangerous system dir', () => {
    // Create a symlink pointing at /etc — common attack vector.
    const linkPath = join(tmpRoot, 'evil-link');
    symlinkSync('/etc', linkPath);

    const r = validateOutputPath(`${linkPath}/passwd`);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/system path|protected/);
  });

  it('canonicalizes /tmp paths to themselves on Linux (or /private/tmp on macOS)', () => {
    const r = validateOutputPath('/tmp/test-canonical.stl');
    expect(r.ok).toBe(true);
    // On Linux /tmp realpath is /tmp; on macOS it is /private/tmp.
    expect(r.resolved).toMatch(/\/tmp\/test-canonical\.stl$|\/private\/tmp\/test-canonical\.stl$/);
  });
});

describe('validateOutputPath — resolved-path recheck', () => {
  it('rejects encoded path traversal that resolves under a deny-list prefix', () => {
    // The literal .. check catches this path; the resolved-path recheck is
    // defense-in-depth for any future bypass that reaches that stage.
    const r = validateOutputPath('/tmp/foo/../etc/passwd');
    expect(r.ok).toBe(false);
    // Either the literal-.. check or the resolved-path recheck rejection is fine.
    expect(r.error).toBeTruthy();
  });
});

describe('validateOutputPath — ~user rejection', () => {
  it('rejects ~root/ tilde expansion with clear error', () => {
    const r = validateOutputPath('~root/foo.stl');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/~user.*tilde|not supported/);
  });

  it('rejects ~someoneelse/ with clear error', () => {
    const r = validateOutputPath('~someoneelse/file.stl');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/~user.*tilde|not supported/);
  });
});

describe('validateOutputPath — canonical path in resolved field', () => {
  it('returns canonical path that has no redundant separators', () => {
    // path.resolve collapses redundant slashes.
    const r = validateOutputPath('/tmp//foo///bar.stl');
    expect(r.ok).toBe(true);
    expect(r.resolved).not.toMatch(/\/\//);
  });
});

describe('validateOutputPath — credential-dir patterns', () => {
  it('rejects ~/.kube/config', () => {
    const r = validateOutputPath('~/.kube/config');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/protected/);
  });

  it('rejects ~/.docker/config.json', () => {
    const r = validateOutputPath('~/.docker/config.json');
    expect(r.ok).toBe(false);
  });

  it('rejects ~/.npmrc', () => {
    const r = validateOutputPath('~/.npmrc');
    expect(r.ok).toBe(false);
  });

  it('rejects ~/.netrc', () => {
    const r = validateOutputPath('~/.netrc');
    expect(r.ok).toBe(false);
  });

  it('rejects ~/.pypirc', () => {
    const r = validateOutputPath('~/.pypirc');
    expect(r.ok).toBe(false);
  });

  it('rejects ~/.gitconfig', () => {
    const r = validateOutputPath('~/.gitconfig');
    expect(r.ok).toBe(false);
  });

  it('rejects ~/.git-credentials', () => {
    const r = validateOutputPath('~/.git-credentials');
    expect(r.ok).toBe(false);
  });
});
