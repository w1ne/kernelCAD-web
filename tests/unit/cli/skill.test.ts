// tests/unit/cli/skill.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installCommand, renderOnefile } from '../../../src/agent/cli/commands/skill';

describe('skill commands', () => {
  it('installCommand installs each skill into its own subdirectory', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-'));
    await installCommand(tmp);
    // kernelcad is always the first skill (sorted); it must have a SKILL.md
    const target = join(tmp, 'kernelcad', 'SKILL.md');
    expect(existsSync(target)).toBe(true);
    const content = readFileSync(target, 'utf8');
    expect(content).toMatch(/^---\nname: kernelcad/);
  });

  it('installCommand creates subdirectories even when target is missing', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-'));
    const nested = join(tmp, 'nested', 'skills');
    await installCommand(nested);
    expect(existsSync(join(nested, 'kernelcad', 'SKILL.md'))).toBe(true);
  });

  it('installCommand covers all 11 skill subdirectories', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'kcad-skill-'));
    await installCommand(tmp);
    const expected = [
      'kernelcad',
      'kernelcad-assemblies',
      'kernelcad-authoring',
      'kernelcad-features',
      'kernelcad-from-reference',
      'kernelcad-mcp',
      'kernelcad-nurbs',
      'kernelcad-params',
      'kernelcad-patterns',
      'kernelcad-sdf',
      'kernelcad-sheet-metal',
    ];
    for (const name of expected) {
      expect(existsSync(join(tmp, name, 'SKILL.md')), `${name}/SKILL.md`).toBe(true);
    }
  });

  it('renderOnefile concatenates all skills starting with the kernelcad entry skill', async () => {
    const content = await renderOnefile();
    // First skill (sorted: kernelcad) must be the entry-decision skill.
    expect(content).toMatch(/^---\nname: kernelcad/);
    // Combined doc should include authoring API content.
    expect(content).toMatch(/Face refs through operations/); // from kernelcad-features
  });

  it('renderOnefile output is non-empty and contains all skill names', async () => {
    const content = await renderOnefile();
    const skillNames = [
      'kernelcad',
      'kernelcad-assemblies',
      'kernelcad-authoring',
      'kernelcad-features',
      'kernelcad-from-reference',
      'kernelcad-mcp',
      'kernelcad-nurbs',
      'kernelcad-params',
      'kernelcad-patterns',
      'kernelcad-sdf',
      'kernelcad-sheet-metal',
    ];
    for (const name of skillNames) {
      expect(content).toContain(`name: ${name}`);
    }
  });
});
