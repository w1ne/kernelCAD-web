import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installCommand } from '../../../src/agent/cli/commands/skill';

describe('kernelcad skill install (deprecation notice)', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
    delete process.env.KERNELCAD_SUPPRESS_DEPRECATION;
  });

  it('prints the npx skills add notice to stderr by default', async () => {
    const dst = mkdtempSync(join(tmpdir(), 'kc-depr-'));
    try {
      await installCommand(dst);
      const calls = errSpy.mock.calls.flat().join('\n');
      expect(calls).toMatch(/npx skills add kernelcad\/skills/);
    } finally {
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('suppresses the notice when KERNELCAD_SUPPRESS_DEPRECATION=1', async () => {
    process.env.KERNELCAD_SUPPRESS_DEPRECATION = '1';
    const dst = mkdtempSync(join(tmpdir(), 'kc-depr-quiet-'));
    try {
      await installCommand(dst);
      const calls = errSpy.mock.calls.flat().join('\n');
      expect(calls).not.toMatch(/npx skills add/);
    } finally {
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('still installs every nested SKILL.md while emitting the notice', async () => {
    // Deprecation should not break the underlying behaviour.
    const dst = mkdtempSync(join(tmpdir(), 'kc-depr-fn-'));
    try {
      await installCommand(dst);
      const { existsSync } = await import('node:fs');
      expect(existsSync(join(dst, 'kernelcad-from-reference/blockout-model/SKILL.md'))).toBe(true);
    } finally {
      rmSync(dst, { recursive: true, force: true });
    }
  });
});
