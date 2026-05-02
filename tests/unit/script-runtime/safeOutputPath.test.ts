import { describe, it, expect } from 'vitest';
import { homedir } from 'node:os';
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
