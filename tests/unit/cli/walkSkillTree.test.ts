import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { walkSkillTree } from '../../../src/agent/cli/lib/walkSkillTree';

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'kc-walk-'));
  mkdirSync(join(root, 'top-a'), { recursive: true });
  mkdirSync(join(root, 'top-b', 'sub-1'), { recursive: true });
  mkdirSync(join(root, 'top-b', 'sub-2'), { recursive: true });
  mkdirSync(join(root, 'top-b', 'nested', 'deep'), { recursive: true });
  writeFileSync(join(root, 'top-a', 'SKILL.md'), '---\nname: top-a\ndescription: x\n---\n');
  writeFileSync(join(root, 'top-b', 'SKILL.md'), '---\nname: top-b\ndescription: y\n---\n');
  writeFileSync(join(root, 'top-b', 'sub-1', 'SKILL.md'), '---\nname: sub-1\ndescription: z\n---\n');
  writeFileSync(join(root, 'top-b', 'sub-2', 'SKILL.md'), '---\nname: sub-2\ndescription: w\n---\n');
  writeFileSync(join(root, 'top-b', 'nested', 'deep', 'SKILL.md'), '---\nname: deep\ndescription: q\n---\n');
  return root;
}

describe('walkSkillTree', () => {
  it('discovers every SKILL.md regardless of depth', () => {
    const root = fixture();
    try {
      const entries = walkSkillTree(root);
      const rels = entries.map((e) => e.relPath).sort();
      expect(rels).toEqual([
        'top-a/SKILL.md',
        'top-b/SKILL.md',
        'top-b/nested/deep/SKILL.md',
        'top-b/sub-1/SKILL.md',
        'top-b/sub-2/SKILL.md',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('parses YAML frontmatter `name` and `description` on every hit', () => {
    const root = fixture();
    try {
      const entries = walkSkillTree(root);
      const sub = entries.find((e) => e.relPath === 'top-b/sub-1/SKILL.md')!;
      expect(sub.frontmatter.name).toBe('sub-1');
      expect(sub.frontmatter.description).toBe('z');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when a SKILL.md is missing required frontmatter', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-walk-bad-'));
    try {
      mkdirSync(join(root, 'broken'), { recursive: true });
      writeFileSync(join(root, 'broken', 'SKILL.md'), '# No frontmatter\n');
      expect(() => walkSkillTree(root)).toThrow(/frontmatter/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns entries in deterministic sort order (relPath ascending)', () => {
    const root = fixture();
    try {
      const a = walkSkillTree(root).map((e) => e.relPath);
      const b = walkSkillTree(root).map((e) => e.relPath);
      expect(a).toEqual(b);
      expect(a).toEqual([...a].sort());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
