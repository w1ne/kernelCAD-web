// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The shipped tube-routing example: five lines across three fluid systems
// pass every gate, and the broken twin fails on the one rule its header names.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateCommand } from '../../../src/agent/cli/commands/evaluate';
import { exportCommand } from '../../../src/agent/cli/commands/export';

const GOOD = 'examples/tube-routing-engine/engine-lines.kcad.ts';
const BROKEN = 'examples/tube-routing-engine/engine-lines-broken.kcad.ts';
const BRANCH = 'examples/tube-routing-engine/engine-lines-branch.kcad.ts';

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

/** Evaluate a copy of the script with other default values for the named params. */
async function evaluateWith(file: string, values: Record<string, number>): Promise<any> {
  let code = readFileSync(file, 'utf8');
  for (const [name, value] of Object.entries(values)) {
    const declared = new RegExp(`param\\('${name}', -?[0-9.]+,`);
    expect(code).toMatch(declared);
    code = code.replace(declared, `param('${name}', ${value},`);
  }
  const dir = mkdtempSync(join(tmpdir(), 'kcad-tube-param-'));
  try {
    const copy = join(dir, 'copy.kcad.ts');
    writeFileSync(copy, code);
    const r = await evaluateJson(copy);
    vi.restoreAllMocks();
    return r;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

  it('the branch example tees the second hydraulic line off the first and passes every gate', async () => {
    const r = await evaluateJson(BRANCH);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.filter((d: { severity: string }) => d.severity !== 'info')).toEqual([]);
    const line = (name: string) => r.tubes.lines.find((l: { name: string }) => l.name === name);
    expect(r.tubes.lines.map((l: { name: string }) => l.name)).toEqual(['fuel-a', 'fuel-b', 'hyd-main', 'hyd-branch', 'oil-feed']);
    // Up 37.4 mm from the outlet, a quarter bend of radius 28.6, then 31.4 mm along the run to x = 0.
    const at = 37.4 + (28.6 * Math.PI) / 2 + 31.4;
    expect(line('hyd-branch').from).toEqual({ tube: 'hyd-main', at: expect.closeTo(at, 6) });
    expect(line('hyd-main').branches).toEqual([{ tube: 'hyd-branch', at: expect.closeTo(at, 6) }]);
    expect(line('hyd-branch').system).toBe('hydraulic');
    expect(line('hyd-branch').bends).toBe(3);
    expect(line('hyd-branch').cutLength).toBeCloseTo(393.41, 1);
    // The trunk is the route hyd-b has in the shipped example.
    expect(line('hyd-main').cutLength).toBeCloseTo(306.45, 1);
    for (const l of r.tubes.lines) expect(l.minClearance.mm).toBeGreaterThanOrEqual(6);
    expect(r.ports.find((p: { part: string }) => p.part === 'actuator-1').usedBy).toEqual(['hyd-branch']);
    expect(r.ports.find((p: { part: string }) => p.part === 'manifold').usedBy).toEqual(['hyd-main']);
  }, 180_000);

  it('the tee of the branch example follows its parameters', async () => {
    const moved = await evaluateWith(BRANCH, { TeeX: 40, ManifoldX: -90 });
    expect(moved.ok).toBe(true);
    // The trunk starts 10 mm further forward, so the same tee is 50 mm further along it.
    const at = 37.4 + (28.6 * Math.PI) / 2 + 31.4 + 50;
    expect(moved.tubes.lines.find((l: { name: string }) => l.name === 'hyd-branch').from.at).toBeCloseTo(at, 6);
    expect(moved.tubes.lines.find((l: { name: string }) => l.name === 'hyd-branch').cutLength).toBeCloseTo(393.41 + 40, 1);

    const close = await evaluateWith(BRANCH, { TeeX: -20 });
    expect(close.ok).toBe(false);
    const errors = close.diagnostics.filter((d: { severity: string }) => d.severity === 'error');
    expect(errors.map((d: { code: string }) => d.code)).toEqual(['tube.branch.too-close']);
    expect(errors[0].message).toContain("11.40 mm from bend 1 of the trunk; the rule needs 19.05 mm");
  }, 180_000);
});
