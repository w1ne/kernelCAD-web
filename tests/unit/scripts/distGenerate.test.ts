import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
// @ts-expect-error - .mjs file with .ts deps; vitest resolves via vite
import { runDistGenerate } from '../../../scripts/distGenerate.mjs';
import { walkSkillTree } from '../../../src/agent/cli/lib/walkSkillTree';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('distGenerate', () => {
  it('emits a dist tree mirroring src/agent/skills with the spec §5.2 layout', async () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-dist-'));
    try {
      await runDistGenerate({ repoRoot, outDir: out });
      // Top-level required files.
      expect(existsSync(join(out, 'README.md'))).toBe(true);
      expect(existsSync(join(out, 'SKILL.md'))).toBe(true);
      expect(existsSync(join(out, 'VERSION'))).toBe(true);
      expect(existsSync(join(out, 'LICENSE'))).toBe(true);
      expect(existsSync(join(out, 'CHANGELOG.md'))).toBe(true);
      // Manifest.
      expect(existsSync(join(out, '.claude-plugin/plugin.json'))).toBe(true);
      // Harness.
      expect(existsSync(join(out, 'harness/AGENTS.md'))).toBe(true);
      expect(existsSync(join(out, 'harness/CLAUDE.md'))).toBe(true);
      // Postinstall.
      expect(existsSync(join(out, 'scripts/postinstall.mjs'))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('count gate: every discovered SKILL.md ends up under dist skills/', async () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-dist-count-'));
    try {
      await runDistGenerate({ repoRoot, outDir: out });
      const srcCount = walkSkillTree(join(repoRoot, 'src/agent/skills')).length;
      const distCount = walkSkillTree(join(out, 'skills')).length;
      expect(distCount).toBe(srcCount);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('VERSION file mirrors package.json#version exactly', async () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-dist-version-'));
    try {
      await runDistGenerate({ repoRoot, outDir: out });
      const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
      expect(readFileSync(join(out, 'VERSION'), 'utf8').trim()).toBe(pkg.version);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('plugin.json#skills[].length equals filesystem discovery count', async () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-dist-manifest-count-'));
    try {
      await runDistGenerate({ repoRoot, outDir: out });
      const manifest = JSON.parse(readFileSync(join(out, '.claude-plugin/plugin.json'), 'utf8'));
      const srcCount = walkSkillTree(join(repoRoot, 'src/agent/skills')).length;
      expect(manifest.skills.length).toBe(srcCount);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('runs the grep gate + tool-name gate + fs-discovery sentinel and reports green', async () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-dist-gates-'));
    try {
      const result = await runDistGenerate({ repoRoot, outDir: out });
      expect(result.gates.grep.ok).toBe(true);
      expect(result.gates.toolName.ok).toBe(true);
      expect(result.gates.fsDiscoverySentinel.ok).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
