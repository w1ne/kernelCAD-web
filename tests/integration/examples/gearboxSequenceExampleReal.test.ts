// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The assembly sequence gearbox example failed evaluate_script with 12
// `mechanism.orphan-part` errors: only the four bolts and the two shaft
// clusters had mates, so the posts, base, rib and both shaft clusters were
// not linked to the root part. The posts are now fastened to the base, the
// rib to the cover, each shaft turns in the base on a revolute mate and each
// bolt is fastened to the cover and to the base. The example must pass the
// gate an agent's own work is held to: `ok: true` and `mechanism: 'real'`.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const FILE = 'examples/assemblies/assembly-sequence-gearbox.kcad.ts';

describe('assembly sequence gearbox example passes evaluate_script', () => {
  it('is ok with a real mechanism and no orphan part', async () => {
    const out = (await callMcpTool('evaluate_script', { file: FILE, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    const problems = out.diagnostics
      .filter((d) => d.severity === 'error' || d.severity === 'warning')
      .map((d) => `${d.code}: ${d.message}`);
    expect(problems).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 120_000);
});
