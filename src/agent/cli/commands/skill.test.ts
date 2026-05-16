import { describe, it, expect } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installCommand, renderOnefile } from './skill';

describe('kernelcad skill install', () => {
  it('writes every SKILL.md from the skill tree into <target>/kernelcad-<name>/SKILL.md', async () => {
    const target = mkdtempSync(join(tmpdir(), 'kc-skill-install-'));
    await installCommand(target);
    const entries = readdirSync(target);
    // Core skill is always present
    expect(entries).toContain('kernelcad');
    expect(entries).toContain('kernelcad-authoring');
    // At least 6 skills total in the tree
    expect(entries.length).toBeGreaterThanOrEqual(6);
    // Each installed entry has a SKILL.md with frontmatter
    for (const name of entries) {
      const md = join(target, name, 'SKILL.md');
      expect(existsSync(md)).toBe(true);
      expect(readFileSync(md, 'utf8').startsWith('---\n')).toBe(true);
    }
  });

  it('the installed kernelcad/SKILL.md has the expected frontmatter name', async () => {
    const target = mkdtempSync(join(tmpdir(), 'kc-skill-install-'));
    await installCommand(target);
    const md = readFileSync(join(target, 'kernelcad', 'SKILL.md'), 'utf8');
    expect(md).toMatch(/^---\nname: kernelcad\n/);
  });
});

describe('kernelcad skill onefile', () => {
  it('concatenates every SKILL.md with frontmatter blocks intact', async () => {
    const text = await renderOnefile();
    // Each skill contributes its own frontmatter block; expect at least 6 instances of '---\nname: '
    const matches = text.match(/---\nname: /g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
    expect(text).toContain('name: kernelcad\n');
    expect(text).toContain('name: kernelcad-authoring\n');
  });
});
