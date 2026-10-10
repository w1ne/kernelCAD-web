// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The shipped tube-routing example: five lines across three fluid systems
// pass every gate, and the broken twin fails on the one rule its header names.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateCommand } from '../../../src/agent/cli/commands/evaluate';
import { exportCommand } from '../../../src/agent/cli/commands/export';

const GOOD = 'examples/tube-routing-engine/engine-lines.kcad.ts';
const BROKEN = 'examples/tube-routing-engine/engine-lines-broken.kcad.ts';

beforeAll(async () => { await initOcct(); }, 120_000);

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

/** The script without its comment lines. */
function codeLines(file: string): string[] {
  return readFileSync(file, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//'));
}

async function evaluateJson(file: string): Promise<any> {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((s: unknown) => { lines.push(String(s)); });
  await evaluateCommand().parseAsync(['node', 'evaluate', file, '--json']);
  return JSON.parse(lines.join('\n'));
}

describe('tube-routing engine example', () => {
  it('the engine example routes five lines across three systems and passes every gate', async () => {
    const r = await evaluateJson(GOOD);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.filter((d: { severity: string }) => d.severity !== 'info')).toEqual([]);
    expect(r.tubes.lines).toHaveLength(5);
    expect(new Set(r.tubes.lines.map((l: { system: string }) => l.system)).size).toBe(3);
    for (const l of r.tubes.lines) {
      expect(l.bends).toBeGreaterThanOrEqual(2);
      expect(l.minClearance.mm).toBeGreaterThanOrEqual(6);
    }
    expect(r.tubes.lines.find((l: { name: string }) => l.name === 'fuel-a').cutLength).toBeCloseTo(309.29, 1);
  }, 180_000);

  it('STEP export keeps one solid per tube', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-tube-step-'));
    try {
      const out = join(dir, 'engine-lines.step');
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await exportCommand().parseAsync(['node', 'export', 'step', GOOD, '-o', out]);
      // Seven parts and five tubes.
      expect(readFileSync(out, 'utf8').match(/MANIFOLD_SOLID_BREP/g)).toHaveLength(12);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 180_000);

  it('the broken twin differs from the example by one corner of hyd-b', () => {
    const good = codeLines(GOOD);
    const broken = codeLines(BROKEN);
    expect(broken).toHaveLength(good.length);
    const changed = good.map((_, i) => i).filter((i) => good[i] !== broken[i]);
    expect(changed).toHaveLength(1);
    const i = changed[0];
    expect(good[i - 2]).toContain("tube('hyd-b'");
    expect(good[i].trim()).toBe('via: [[manifoldX.add(20), -190, hydRunZ], [act2X, -190, hydRunZ]],');
    expect(broken[i].trim()).toBe('via: [[manifoldX.add(20), -190, hydRunZ], [act2X, -190, hydRunZ.add(-8)]],');
  });

  it('the broken twin fails on exactly the documented rule', async () => {
    const r = await evaluateJson(BROKEN);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.filter((d: { severity: string }) => d.severity === 'error').map((d: { code: string }) => d.code))
      .toEqual(['tube.clearance.violated']);
  }, 180_000);
});
