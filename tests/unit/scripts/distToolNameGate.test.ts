import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { runToolNameGate } from '../../../scripts/lib/distToolNameGate';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('distToolNameGate', () => {
  it('passes when every backtick-quoted tool reference resolves in TOOL_REGISTRY', () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-tn-clean-'));
    try {
      mkdirSync(join(out, 'skills/x'), { recursive: true });
      writeFileSync(
        join(out, 'skills/x/SKILL.md'),
        '---\nname: x\ndescription: y\n---\nCall `evaluate_script`, `list_features`, `inspect_assembly`.\n',
      );
      const r = runToolNameGate({ outDir: out, repoRoot });
      expect(r.ok).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('fails when a SKILL.md references a tool name that does not exist in the registry', () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-tn-drift-'));
    try {
      mkdirSync(join(out, 'skills/x'), { recursive: true });
      writeFileSync(
        join(out, 'skills/x/SKILL.md'),
        '---\nname: x\ndescription: y\n---\nCall `definitely_not_a_real_tool_xyz`.\n',
      );
      const r = runToolNameGate({ outDir: out, repoRoot });
      expect(r.ok).toBe(false);
      expect(r.hits.some((h) => h.match.includes('definitely_not_a_real_tool_xyz'))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('also resolves CLI commands like `kernelcad evaluate` / `kernelcad export`', () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-tn-cli-'));
    try {
      mkdirSync(join(out, 'skills/x'), { recursive: true });
      writeFileSync(
        join(out, 'skills/x/SKILL.md'),
        '---\nname: x\ndescription: y\n---\nRun `kernelcad evaluate file.kcad.ts` then `kernelcad export step file.kcad.ts -o out.step`.\n',
      );
      const r = runToolNameGate({ outDir: out, repoRoot });
      expect(r.ok).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('ignores prose backticks that are not tool or command references', () => {
    const out = mkdtempSync(join(tmpdir(), 'kc-tn-prose-'));
    try {
      mkdirSync(join(out, 'skills/x'), { recursive: true });
      writeFileSync(
        join(out, 'skills/x/SKILL.md'),
        '---\nname: x\ndescription: y\n---\nUse `M3` fasteners with `0.05 mm` clearance.\n',
      );
      const r = runToolNameGate({ outDir: out, repoRoot });
      expect(r.ok).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
