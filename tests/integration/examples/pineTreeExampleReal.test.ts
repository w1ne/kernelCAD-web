// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/assets/pine-tree.kcad.ts must pass evaluate_script with
// `ok: true`. It failed with 1 error: the trunk was extruded to 30 % of the
// height, so it ran 450 mm (default 4.5 m tree) into the lowest foliage tier
// (`mechanism.interpenetration` trunk/foliage-1). The trunk now stops on the
// base of the lowest tier. Every tier choice is checked because the tier
// spacing depends on it.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const FILE = 'examples/assets/pine-tree.kcad.ts';
const SOURCE = readFileSync(FILE, 'utf8');

beforeAll(async () => {
  await initOcct();
}, 60_000);

type Out = {
  ok: boolean;
  diagnostics: { code: string; severity: string; message: string }[];
};

describe('pine-tree example', () => {
  it('passes evaluate_script with no diagnostics at the defaults', async () => {
    const out = (await callMcpTool('evaluate_script', { file: FILE, autosave: false } as never)) as Out;
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
  }, 120_000);

  it.each(['2', '4', '5'])('has no interpenetration with %s foliage tiers', async (tiers) => {
    const code = SOURCE.replace("param('tiers', '3'", `param('tiers', '${tiers}'`);
    expect(code).not.toBe(SOURCE);
    const out = (await callMcpTool('evaluate_script', { code, autosave: false } as never)) as Out;
    expect(out.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
  }, 120_000);
});
