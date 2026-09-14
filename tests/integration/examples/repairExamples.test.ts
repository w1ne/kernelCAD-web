// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Pins the trace-guided repair example so it cannot rot.
//
// `examples/repair/` ships deliberately broken models plus a walkthrough
// script. Two things must stay true: every fixture really is broken for the
// reason its header says, and the exact command in the README repairs all of
// them. Both are checked here against the files on disk.

import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { repairScriptTool } from '../../../src/agent/mcp/tools/repairScript';

const REPO_ROOT = resolve(__dirname, '../../..');
const EXAMPLE_DIR = join(REPO_ROOT, 'examples/repair');

const FIXTURES: Array<{ file: string; code: string; repairedLine: string }> = [
  {
    file: 'oversized-fillet.kcad.ts',
    code: 'feature.edge-feature.short-edges-skipped',
    repairedLine: 'return block.fillet(3.2);',
  },
  {
    file: 'hole-misses-plate.kcad.ts',
    code: 'feature.subtractive-noop',
    repairedLine: "return plate.hole('top', { u: 25, v: 0, diameter: 5, depth: 10 });",
  },
  {
    file: 'cutter-misses-body.kcad.ts',
    code: 'feature.subtractive-noop',
    repairedLine: 'const cutter = box(10, 10, 60).translate(15, 15, -10);',
  },
];

describe('examples/repair — fixtures', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  for (const fixture of FIXTURES) {
    it(`${fixture.file} is broken with ${fixture.code} and repairs clean`, async () => {
      const file = join(EXAMPLE_DIR, fixture.file);

      const before = await evaluateScriptTool({ file, skipMechanismCheck: true });
      expect(before.ok).toBe(false);
      expect(before.diagnostics.map(d => d.code)).toContain(fixture.code);

      const repaired = await repairScriptTool({ file, strategy: 'apply-first' });
      expect(repaired.ok, JSON.stringify(repaired.attempts)).toBe(true);
      expect(repaired.new_code?.split('\n')).toContain(fixture.repairedLine);

      const after = await evaluateScriptTool({ code: repaired.new_code!, skipMechanismCheck: true });
      expect(after.ok, JSON.stringify(after.diagnostics)).toBe(true);

      // The walkthrough never rewrites the fixture — it must stay broken.
      expect(readFileSync(file, 'utf8')).not.toContain(fixture.repairedLine);
    }, 120000);
  }
});

describe('examples/repair — walkthrough command', () => {
  it('runs the README command and repairs every fixture', () => {
    const tsx = join(REPO_ROOT, 'node_modules/.bin/tsx');
    const output = execFileSync(tsx, ['examples/repair/run-repair-example.ts'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 240_000,
    });

    for (const fixture of FIXTURES) {
      expect(output).toContain(`REPAIRED  examples/repair/${fixture.file}`);
      expect(output).toContain(`+${fixture.repairedLine}`);
    }
    expect(output).not.toContain('NOT REPAIRED');
  }, 300000);
});
