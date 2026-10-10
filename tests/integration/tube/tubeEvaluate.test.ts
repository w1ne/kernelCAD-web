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

const GOOD = 'tests/fixtures/tube/one-line.kcad.ts';
const BAD = 'tests/fixtures/tube/one-line-tight-bend.kcad.ts';

beforeAll(async () => { await initOcct(); }, 120_000);

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

async function evaluateJson(file: string): Promise<any> {
  const lines: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((s: unknown) => { lines.push(String(s)); });
  await evaluateCommand().parseAsync(['node', 'evaluate', file, '--json']);
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

  it('evaluate_script returns tubes for the passing fixture and warns do not fail it', async () => {
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
});
