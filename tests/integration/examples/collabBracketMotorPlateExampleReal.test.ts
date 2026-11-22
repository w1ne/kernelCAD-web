// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/collab/bracket-and-motor-plate.kcad.ts must pass evaluate_script
// with `ok: true` and `mechanism: 'real'`. It failed with one
// mechanism.interpenetration error: both plates were placed at the origin with
// no mate, so they overlapped by 6914.65 mm3. The motor plate is now fastened
// on the bracket top face, and the seat follows the plateT parameter.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const FILE = 'examples/collab/bracket-and-motor-plate.kcad.ts';

type EvalOut = {
  ok: boolean;
  mechanism?: string;
  diagnostics: { code: string; severity: string; message: string }[];
};

async function evaluate(code: string): Promise<EvalOut> {
  return (await callMcpTool('evaluate_script', { code, autosave: false } as never)) as EvalOut;
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('bracket-and-motor-plate collab example', () => {
  const source = readFileSync(FILE, 'utf8');

  it('passes evaluate_script with a real mechanism and no diagnostics', async () => {
    const out = await evaluate(source);
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);

  it('keeps the motor plate seated when plateT changes', async () => {
    const edited = source.replace("param('plateT', 6", "param('plateT', 9");
    expect(edited).not.toBe(source);
    const out = await evaluate(edited);
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);
});
