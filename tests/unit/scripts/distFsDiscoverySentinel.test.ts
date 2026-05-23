import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runFsDiscoverySentinel } from '../../../scripts/lib/distFsDiscoverySentinel';

describe('distFsDiscoverySentinel', () => {
  it('passes when generator source contains no hard-coded skill names', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-sentinel-clean-'));
    try {
      mkdirSync(join(root, 'scripts/lib'), { recursive: true });
      writeFileSync(
        join(root, 'scripts/distGenerate.mjs'),
        "import { walkSkillTree } from '../src/...';\nexport async function runDistGenerate(){return walkSkillTree('x');}\n",
      );
      const r = runFsDiscoverySentinel({ repoRoot: root });
      expect(r.ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails when a hard-coded skill name appears in generator source', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-sentinel-dirty-'));
    try {
      mkdirSync(join(root, 'scripts/lib'), { recursive: true });
      writeFileSync(
        join(root, 'scripts/distGenerate.mjs'),
        "const SKILLS = ['kernelcad-urdf', 'kernelcad-parts'];\n",
      );
      const r = runFsDiscoverySentinel({ repoRoot: root });
      expect(r.ok).toBe(false);
      expect(r.hits.some((h) => /kernelcad-urdf/.test(h.match))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignores skill names that appear inside string literals in TEST files', () => {
    // Tests legitimately reference skill names in assertions; the sentinel
    // scopes itself to scripts/distGenerate.mjs + scripts/lib/dist*.ts only.
    const root = mkdtempSync(join(tmpdir(), 'kc-sentinel-tests-'));
    try {
      mkdirSync(join(root, 'scripts/lib'), { recursive: true });
      mkdirSync(join(root, 'tests/unit/scripts'), { recursive: true });
      writeFileSync(
        join(root, 'scripts/distGenerate.mjs'),
        "import { walkSkillTree } from '../src/...';\n",
      );
      writeFileSync(
        join(root, 'tests/unit/scripts/distGenerate.test.ts'),
        "expect(arr).toContain('kernelcad-urdf');\n",
      );
      const r = runFsDiscoverySentinel({ repoRoot: root });
      expect(r.ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
