// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/kinematic/jointed-tendon-anchor-at.kcad.ts must pass evaluate_script
// with `ok: true` and `mechanism: 'real'`. It failed with one
// mechanism.tendon-body-intersect error for two reasons: the hook and the eye
// were on the far ends of their parts, so the cable ran through both bodies,
// and the tendon check read the placed base's hook without its `at` (x=-10,
// not x=90), so even facing anchors routed the cable through the link.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';

const FILE = 'examples/kinematic/jointed-tendon-anchor-at.kcad.ts';

type EvalOut = {
  ok: boolean;
  mechanism?: string;
  diagnostics: { code: string; severity: string; message: string }[];
};

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('jointed-tendon-anchor-at example', () => {
  it('passes evaluate_script with a real mechanism and no diagnostics', async () => {
    const code = readFileSync(FILE, 'utf8');
    const out = (await callMcpTool('evaluate_script', { code, autosave: false } as never)) as EvalOut;
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);
});
