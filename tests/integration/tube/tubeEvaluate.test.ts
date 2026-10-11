// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The tube gate on the evaluation seam: `evaluate --json` and the MCP
// `evaluate_script` result carry the line report, and a rule break fails.

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateCommand } from '../../../src/agent/cli/commands/evaluate';
import { evaluateScriptTool } from '../../../src/agent/mcp/tools/evaluateScript';
import { TOOL_OUTPUT_SCHEMAS } from '../../../src/agent/mcp/toolOutputSchemas';

const GOOD = 'tests/fixtures/tube/one-line.kcad.ts';
const NO_SPEC = 'tests/fixtures/tube/one-line-no-spec.kcad.ts';
const BAD = 'tests/fixtures/tube/one-line-tight-bend.kcad.ts';
const PORTS_ONLY = 'tests/fixtures/tube/ports-no-tube.kcad.ts';

beforeAll(async () => { await initOcct(); }, 120_000);

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

async function evaluateJson(file: string, ...flags: string[]): Promise<any> {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((s: unknown) => { lines.push(String(s)); });
  await evaluateCommand().parseAsync(['node', 'evaluate', file, '--json', ...flags]);
  return JSON.parse(lines.join('\n'));
}

describe('tube gate on the evaluation seam', () => {
  it('evaluate --json carries the line report and fails on a rule break', async () => {
    const good = await evaluateJson(GOOD);
    expect(good.ok).toBe(true);
    expect(good.tubes.lines[0]).toMatchObject({ name: 'fuel-1', bends: 1 });
    expect(good.tubes.systems).toEqual([{ system: 'fuel', lines: 1, cutLength: expect.any(Number), massKg: null }]);
    expect(good.tubes.diagnostics).toBeUndefined();
    expect(good.tubes.timings).toBeUndefined();

    const bad = await evaluateJson(BAD);
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics.map((d: { code: string }) => d.code)).toContain('tube.bend.radius-too-small');
    expect(bad.tubes.lines).toHaveLength(1);
  }, 120_000);

  it('a script without tubes has no tubes key', async () => {
    const out = await evaluateJson('tests/fixtures/tube/no-tube.kcad.ts');
    expect(out.ok).toBe(true);
    expect('tubes' in out).toBe(false);
  }, 120_000);

  it('--envelope keeps tubes, for a passing and a failing line', async () => {
    const good = await evaluateJson(GOOD, '--envelope');
    expect(good.ok).toBe(true);
    expect(good.tubes.lines[0]).toMatchObject({ name: 'fuel-1', bends: 1 });
    expect(good.tubes.systems).toHaveLength(1);

    const bad = await evaluateJson(BAD, '--envelope');
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics.map((d: { code: string }) => d.code)).toContain('tube.bend.radius-too-small');
    expect(bad.tubes.lines[0]).toMatchObject({ name: 'fuel-1', bends: 1 });
  }, 120_000);

  it('a warn from the gate does not fail evaluation: a line without tubeSpec still reports', async () => {
    const out = await evaluateJson(NO_SPEC);
    expect(out.ok).toBe(true);
    const warn = out.diagnostics.find((d: { code: string }) => d.code === 'tube.spec.defaulted');
    expect(warn).toMatchObject({ severity: 'warn' });
    expect(out.tubes.lines).toHaveLength(1);
  }, 120_000);

  it('evaluate_script returns tubes for the passing fixture and fails the broken one', async () => {
    const code = await readFile(GOOD, 'utf8');
    const r = await evaluateScriptTool({ code });
    expect(r.ok).toBe(true);
    expect(r.tubes?.lines[0]).toMatchObject({ name: 'fuel-1', system: 'fuel', bends: 1 });
    expect(r.tubes?.systems).toEqual([{ system: 'fuel', lines: 1, cutLength: expect.any(Number), massKg: null }]);
    expect(r.tubes).not.toHaveProperty('diagnostics');
    expect(r.tubes).not.toHaveProperty('timings');

    const bad = await evaluateScriptTool({ code: await readFile(BAD, 'utf8') });
    expect(bad.ok).toBe(false);
    expect(bad.diagnostics.map(d => d.code)).toContain('tube.bend.radius-too-small');
  }, 120_000);

  const FUEL_PORTS = [
    { part: 'block', name: 'p1', system: 'fuel', od: 10, origin: [20, 20, 40], axis: [0, 0, 1], placedBy: 'at', usedBy: ['fuel-1'] },
    { part: 'block', name: 'p2', system: 'bleed', od: 10, origin: [40, 20, 20], axis: [1, 0, 0], placedBy: 'at', usedBy: [] },
  ];
  const FREE_PORTS = FUEL_PORTS.map((p) => ({ ...p, usedBy: [] }));

  it('evaluate --json carries ports beside tubes, with and without --envelope, pass or fail', async () => {
    expect((await evaluateJson(GOOD)).ports).toEqual(FUEL_PORTS);
    expect((await evaluateJson(GOOD, '--envelope')).ports).toEqual(FUEL_PORTS);
    expect((await evaluateJson(BAD)).ports).toEqual(FUEL_PORTS);
    expect((await evaluateJson(BAD, '--envelope')).ports).toEqual(FUEL_PORTS);
  }, 180_000);

  it('ports are there for an assembly with ports and no tubes, and absent without an assembly', async () => {
    for (const flags of [[], ['--envelope']]) {
      const out = await evaluateJson(PORTS_ONLY, ...flags);
      expect(out.ok).toBe(true);
      expect('tubes' in out).toBe(false);
      expect(out.ports).toEqual(FREE_PORTS);
      expect('ports' in await evaluateJson('tests/fixtures/tube/no-tube.kcad.ts', ...flags)).toBe(false);
    }
  }, 180_000);

  it('evaluate_script returns ports that fit the output schema', async () => {
    const schema = TOOL_OUTPUT_SCHEMAS.evaluate_script.properties.ports;
    const fits = (r: Awaited<ReturnType<typeof evaluateScriptTool>>): void => {
      expect(schema.type).toBe('array');
      for (const port of r.ports!) {
        expect(Object.keys(schema.items.properties)).toEqual(expect.arrayContaining(Object.keys(port)));
        expect(Object.keys(port)).toEqual(expect.arrayContaining([...schema.items.required]));
        for (const [key, value] of Object.entries(port)) {
          const type = (schema.items.properties as Record<string, { type: string }>)[key].type;
          expect(Array.isArray(value) ? 'array' : typeof value, key).toBe(type);
        }
      }
    };
    const withTube = await evaluateScriptTool({ code: await readFile(GOOD, 'utf8') });
    expect(withTube.ports).toEqual(FUEL_PORTS);
    fits(withTube);
    const portsOnly = await evaluateScriptTool({ code: await readFile(PORTS_ONLY, 'utf8') });
    expect(portsOnly.ok).toBe(true);
    expect(portsOnly.tubes).toBeUndefined();
    expect(portsOnly.ports).toEqual(FREE_PORTS);
    fits(portsOnly);
    const unresolved = await evaluateScriptTool({ code: `
const asm = assembly('rig');
asm.part('block', box(40, 40, 40))
  .connector('top', { type: 'axis', origin: '@kc[block/face/top]', axis: [0, 0, 1], port: { system: 'fuel', od: 10, minStraight: 12 } });
return asm.model();` });
    expect(unresolved.ports).toEqual([{ part: 'block', name: 'top', system: 'fuel', od: 10, minStraight: 12, usedBy: [],
      unresolved: expect.any(String) }]);
    fits(unresolved);
    expect((await evaluateScriptTool({ code: 'return box(10, 10, 10);' })).ports).toBeUndefined();
  }, 180_000);
});
