// tests/unit/cli/skill.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkill, oneFileSkill } from '../../../src/cli/commands/skill';

describe('skill commands', () => {
  it('installSkill writes SKILL.md to <dir>/SKILL.md', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-'));
    const r = installSkill({ dir: tmp });
    expect(r.ok).toBe(true);
    const target = join(tmp, 'SKILL.md');
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
    expect(content).toMatch(/Face refs through operations/); // a unique-enough section heading
  });

  it('installSkill creates the directory if missing', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-'));
    const nested = join(tmp, 'nested', 'kernelcad');
    const r = installSkill({ dir: nested });
    expect(r.ok).toBe(true);
    expect(existsSync(join(nested, 'SKILL.md'))).toBe(true);
  });

  it('oneFileSkill writes SKILL.md content to a path', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-'));
    const out = join(tmp, 'kernelcad-context.md');
    const r = oneFileSkill({ path: out });
    expect(r.ok).toBe(true);
    expect(existsSync(out)).toBe(true);
    const content = readFileSync(out, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });
});
