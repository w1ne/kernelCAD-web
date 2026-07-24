import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { installCommand } from '../../../src/agent/cli/commands/skill';

const skillsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'src',
  'agent',
  'skills',
);

describe('kernelcad skill install (recursion fix)', () => {
  it('installs every nested SKILL.md, not just top-level', async () => {
    const dst = mkdtempSync(join(tmpdir(), 'kc-install-'));
    try {
      await installCommand(dst);
      // Top-level skill present.
      expect(existsSync(join(dst, 'kernelcad-from-reference/SKILL.md'))).toBe(true);
      // All seven nested from-reference sub-skills must be present.
      for (const sub of [
        'blockout-model',
        'image-replicator',
        'kernelcad-trace-from-image',
        'photo-to-device',
        'prepare-prompt',
        'render-inspect',
        'use-the-available-kernel',
      ]) {
        expect(existsSync(join(dst, 'kernelcad-from-reference', sub, 'SKILL.md'))).toBe(true);
      }
    } finally {
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('preserves the relative directory structure of the source tree', async () => {
    const dst = mkdtempSync(join(tmpdir(), 'kc-install-shape-'));
    try {
      await installCommand(dst);
      // Top-level kernelcad skill at the install root.
      expect(existsSync(join(dst, 'kernelcad/SKILL.md'))).toBe(true);
      // Nested sub-skill at preserved relative depth.
      expect(existsSync(join(dst, 'kernelcad-from-reference/blockout-model/SKILL.md'))).toBe(true);
    } finally {
      rmSync(dst, { recursive: true, force: true });
    }
  });

  it('discovers at least 17 SKILL.md files in the live source tree', async () => {
    // Count gate: at plan-write time the source tree has 17 SKILL.md.
    // Sibling slices (B-rest +3, C +1, E +1) will push this higher.
    // The assertion uses >= so future slice landings do not require a
    // change here, and the recursion bug (which dropped us to ~11) is
    // permanently caught.
    const { walkSkillTree } = await import('../../../src/agent/cli/lib/walkSkillTree');
    const entries = walkSkillTree(skillsRoot);
    expect(entries.length).toBeGreaterThanOrEqual(17);
  });
});
