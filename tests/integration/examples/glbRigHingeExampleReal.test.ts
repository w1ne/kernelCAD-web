// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// examples/assemblies/glb-rig-hinge.kcad.ts is the example the cheat sheet
// and the GLB rig demo name for rig export, so it must pass evaluate_script
// with `ok: true` and `mechanism: 'real'`. It failed with 4 errors: the hinge
// axis was 9 mm away from the lid, the lid was 6.2 mm away from the base at
// the 35 deg rest pose, and it cut 1.4 mm into the base at 0 deg. The base
// now has a hinge ear, the end face of the lid bears on that ear, and the
// axis goes through both parts.

import { describe, expect, it } from 'vitest';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const EXAMPLE = 'examples/assemblies/glb-rig-hinge.kcad.ts';

describe('glb-rig-hinge example passes evaluate_script', () => {
  it('is ok with a real mechanism and no diagnostics', async () => {
    const out = (await callMcpTool('evaluate_script', { file: EXAMPLE, autosave: false } as never)) as {
      ok: boolean;
      mechanism?: string;
      diagnostics: { code: string; severity: string; message: string }[];
    };
    expect(out.diagnostics.map((d) => `${d.severity} ${d.code}: ${d.message}`)).toEqual([]);
    expect(out.ok).toBe(true);
    expect(out.mechanism).toBe('real');
  }, 180_000);
});
